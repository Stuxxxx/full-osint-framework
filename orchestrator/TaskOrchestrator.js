// orchestrator/TaskOrchestrator.js
const { config } = require('../core/config');

class TaskOrchestrator {
  constructor(gateway = null) {
    this.gateway = gateway;
    this.activeTasks = new Map();
    this.taskHistory = [];
    
    console.log('🎛️ TaskOrchestrator initialisé');
  }

  /**
   * Recherche complète multi-services
   */
  async comprehensiveSearch(parameters) {
    const taskId = this.generateTaskId('comprehensive_search');
    
    try {
      this.activeTasks.set(taskId, {
        type: 'comprehensive_search',
        status: 'running',
        startTime: Date.now(),
        parameters
      });

      const { target, enabledServices = ['telegram'], options = {} } = parameters;
      
      console.log(`🔍 Démarrage recherche complète pour: ${target}`);
      
      // Phase 1: Recherche initiale sur tous les services
      const initialResults = await this.performParallelSearch(target, enabledServices, options);
      
      // Phase 2: Analyse et extraction d'entités
      const entities = await this.extractEntities(initialResults);
      
      // Phase 3: Recherche étendue basée sur les entités trouvées
      const extendedResults = await this.performExtendedSearch(entities, enabledServices, options);
      
      // Phase 4: Cross-référencement et corrélation
      const correlations = await this.performCorrelation(initialResults, extendedResults);
      
      // Phase 5: Analyse finale et scoring
      const finalAnalysis = await this.performFinalAnalysis({
        initial: initialResults,
        extended: extendedResults,
        correlations
      });

      const result = {
        taskId,
        target,
        summary: {
          totalSources: Object.keys(initialResults).length,
          totalResults: this.countTotalResults(initialResults) + this.countTotalResults(extendedResults),
          entitiesFound: entities.length,
          correlationsFound: correlations.length,
          confidenceScore: finalAnalysis.confidenceScore
        },
        phases: {
          initial: initialResults,
          entities,
          extended: extendedResults,
          correlations,
          analysis: finalAnalysis
        },
        duration: Date.now() - this.activeTasks.get(taskId).startTime
      };

      this.completeTask(taskId, result);
      
      console.log(`✅ Recherche complète terminée: ${result.summary.totalResults} résultats`);
      
      return result;

    } catch (error) {
      this.failTask(taskId, error);
      throw error;
    }
  }

  /**
   * Cross-référencement entre différentes sources
   */
  async crossReference(parameters) {
    const taskId = this.generateTaskId('cross_reference');
    
    try {
      this.activeTasks.set(taskId, {
        type: 'cross_reference',
        status: 'running',
        startTime: Date.now(),
        parameters
      });

      const { sources, criteria = ['username', 'email', 'phone'] } = parameters;
      
      console.log('🔗 Démarrage cross-référencement...');
      
      const matches = [];
      const processed = new Set();
      
      // Comparer chaque source avec les autres
      for (const sourceA of sources) {
        for (const sourceB of sources) {
          if (sourceA.id !== sourceB.id && !processed.has(`${sourceA.id}-${sourceB.id}`)) {
            const match = await this.compareSources(sourceA, sourceB, criteria);
            if (match.score > 0.3) { // Seuil de similarité
              matches.push(match);
            }
            processed.add(`${sourceA.id}-${sourceB.id}`);
            processed.add(`${sourceB.id}-${sourceA.id}`);
          }
        }
      }

      // Grouper les matches en clusters
      const clusters = this.groupMatches(matches);
      
      const result = {
        taskId,
        totalSources: sources.length,
        totalMatches: matches.length,
        clusters,
        criteria,
        duration: Date.now() - this.activeTasks.get(taskId).startTime
      };

      this.completeTask(taskId, result);
      
      console.log(`✅ Cross-référencement terminé: ${matches.length} correspondances`);
      
      return result;

    } catch (error) {
      this.failTask(taskId, error);
      throw error;
    }
  }

  /**
   * Analyse temporelle des données
   */
  async timelineAnalysis(parameters) {
    const taskId = this.generateTaskId('timeline_analysis');
    
    try {
      this.activeTasks.set(taskId, {
        type: 'timeline_analysis',
        status: 'running',
        startTime: Date.now(),
        parameters
      });

      const { data, timeRange, granularity = 'day' } = parameters;
      
      console.log('📅 Démarrage analyse temporelle...');
      
      // Extraire et normaliser les timestamps
      const events = this.extractTimestamps(data);
      
      // Créer la timeline
      const timeline = this.createTimeline(events, timeRange, granularity);
      
      // Détecter les patterns temporels
      const patterns = this.detectTemporalPatterns(timeline);
      
      // Analyser les anomalies
      const anomalies = this.detectAnomalies(timeline);
      
      const result = {
        taskId,
        timeline,
        patterns,
        anomalies,
        statistics: this.calculateTimelineStats(timeline),
        duration: Date.now() - this.activeTasks.get(taskId).startTime
      };

      this.completeTask(taskId, result);
      
      console.log(`✅ Analyse temporelle terminée: ${timeline.length} points`);
      
      return result;

    } catch (error) {
      this.failTask(taskId, error);
      throw error;
    }
  }

  /**
   * Recherche parallèle sur tous les services
   */
  async performParallelSearch(target, services, options) {
    const promises = services.map(async (serviceName) => {
      if (!config.services[serviceName] || !config.services[serviceName].enabled) {
        return { [serviceName]: { error: 'Service non disponible' } };
      }

      try {
        const result = await this.gateway.callService(serviceName, '/search', {
          username: target,
          options: options[serviceName] || {}
        });
        
        return { [serviceName]: result };
      } catch (error) {
        console.error(`Erreur service ${serviceName}:`, error.message);
        return { [serviceName]: { error: error.message } };
      }
    });

    const results = await Promise.allSettled(promises);
    
    // Combiner tous les résultats
    const combined = {};
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        Object.assign(combined, result.value);
      }
    });

    return combined;
  }

  /**
   * Extraction d'entités depuis les résultats
   */
  async extractEntities(results) {
    const entities = new Set();
    
    Object.values(results).forEach(serviceResult => {
      if (serviceResult.data && serviceResult.data.sources) {
        Object.values(serviceResult.data.sources).forEach(sourceData => {
          if (Array.isArray(sourceData)) {
            sourceData.forEach(item => {
              // Extraire usernames
              if (item.username) entities.add(item.username);
              if (item.title) {
                // Extraire @usernames depuis les titres
                const mentions = item.title.match(/@\w+/g);
                if (mentions) mentions.forEach(mention => entities.add(mention));
              }
              // Extraire autres entités (URLs, hashtags, etc.)
              if (item.url) {
                const urlEntities = this.extractUrlEntities(item.url);
                urlEntities.forEach(entity => entities.add(entity));
              }
            });
          }
        });
      }
    });

    return Array.from(entities).filter(entity => entity.length > 2);
  }

  /**
   * Recherche étendue basée sur les entités
   */
  async performExtendedSearch(entities, services, options) {
    const extendedResults = {};
    
    // Limiter le nombre d'entités pour éviter trop de requêtes
    const topEntities = entities.slice(0, 5);
    
    for (const entity of topEntities) {
      console.log(`🔍 Recherche étendue pour: ${entity}`);
      
      const entityResults = await this.performParallelSearch(entity, services, {
        ...options,
        maxResults: 5 // Limiter pour la recherche étendue
      });
      
      extendedResults[entity] = entityResults;
      
      // Délai pour éviter le rate limiting
      await this.delay(1000);
    }

    return extendedResults;
  }

  /**
   * Corrélation entre résultats
   */
  async performCorrelation(initialResults, extendedResults) {
    const correlations = [];
    
    // Analyser les connexions entre les résultats initiaux et étendus
    Object.entries(extendedResults).forEach(([entity, entityResults]) => {
      Object.entries(initialResults).forEach(([service, serviceResults]) => {
        const correlation = this.findCorrelations(entity, entityResults, serviceResults);
        if (correlation.strength > 0.5) {
          correlations.push({
            entity,
            service,
            correlation
          });
        }
      });
    });

    return correlations;
  }

  /**
   * Analyse finale et scoring
   */
  async performFinalAnalysis(allResults) {
    const { initial, extended, correlations } = allResults;
    
    // Calculer un score de confiance global
    const totalResults = this.countTotalResults(initial) + this.countTotalResults(extended);
    const correlationScore = correlations.length * 0.1;
    const diversityScore = Object.keys(initial).length * 0.2;
    
    const confidenceScore = Math.min(100, 
      (totalResults * 0.1) + correlationScore + diversityScore
    );

    // Identifier les patterns principaux
    const patterns = this.identifyPatterns(allResults);
    
    // Recommandations d'investigation
    const recommendations = this.generateRecommendations(allResults);

    return {
      confidenceScore: Math.round(confidenceScore),
      patterns,
      recommendations,
      summary: {
        totalSources: Object.keys(initial).length,
        totalResults,
        highConfidenceResults: this.countHighConfidenceResults(allResults),
        uniqueEntities: this.countUniqueEntities(allResults)
      }
    };
  }

  // Méthodes utilitaires

  generateTaskId(type) {
    return `${type}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  completeTask(taskId, result) {
    if (this.activeTasks.has(taskId)) {
      const task = this.activeTasks.get(taskId);
      task.status = 'completed';
      task.result = result;
      task.endTime = Date.now();
      
      this.taskHistory.push(task);
      this.activeTasks.delete(taskId);
    }
  }

  failTask(taskId, error) {
    if (this.activeTasks.has(taskId)) {
      const task = this.activeTasks.get(taskId);
      task.status = 'failed';
      task.error = error.message;
      task.endTime = Date.now();
      
      this.taskHistory.push(task);
      this.activeTasks.delete(taskId);
    }
  }

  countTotalResults(results) {
    let total = 0;
    Object.values(results).forEach(serviceResult => {
      if (serviceResult.data && serviceResult.data.totalResults) {
        total += serviceResult.data.totalResults;
      }
    });
    return total;
  }

  countHighConfidenceResults(allResults) {
    // Logique pour compter les résultats haute confiance
    return 0; // À implémenter
  }

  countUniqueEntities(allResults) {
    const entities = new Set();
    // Logique pour extraire et compter les entités uniques
    return entities.size;
  }

  extractUrlEntities(url) {
    const entities = [];
    // Extraire des entités depuis les URLs (domaines, paths, etc.)
    try {
      const urlObj = new URL(url);
      entities.push(urlObj.hostname);
      // Ajouter d'autres extractions selon le besoin
    } catch (e) {
      // URL invalide
    }
    return entities;
  }

  compareSources(sourceA, sourceB, criteria) {
    let score = 0;
    const matches = [];
    
    criteria.forEach(criterion => {
      if (sourceA[criterion] && sourceB[criterion]) {
        if (sourceA[criterion] === sourceB[criterion]) {
          score += 1;
          matches.push(criterion);
        }
      }
    });
    
    return {
      sourceA: sourceA.id,
      sourceB: sourceB.id,
      score: score / criteria.length,
      matches
    };
  }

  groupMatches(matches) {
    // Logique pour grouper les correspondances en clusters
    const clusters = [];
    // À implémenter selon les besoins
    return clusters;
  }

  extractTimestamps(data) {
    const events = [];
    // Extraire les timestamps des données
    // À implémenter selon la structure des données
    return events;
  }

  createTimeline(events, timeRange, granularity) {
    // Créer une timeline selon la granularité
    const timeline = [];
    // À implémenter
    return timeline;
  }

  detectTemporalPatterns(timeline) {
    // Détecter des patterns temporels
    const patterns = [];
    // À implémenter
    return patterns;
  }

  detectAnomalies(timeline) {
    // Détecter des anomalies temporelles
    const anomalies = [];
    // À implémenter
    return anomalies;
  }

  calculateTimelineStats(timeline) {
    return {
      totalEvents: timeline.length,
      timespan: 0, // À calculer
      averageFrequency: 0 // À calculer
    };
  }

  findCorrelations(entity, entityResults, serviceResults) {
    // Logique pour trouver des corrélations
    return { strength: 0 };
  }

  identifyPatterns(allResults) {
    // Identifier des patterns dans tous les résultats
    return [];
  }

  generateRecommendations(allResults) {
    // Générer des recommandations d'investigation
    return [
      "Approfondir la recherche sur les entités hautement corrélées",
      "Analyser les anomalies temporelles détectées",
      "Vérifier les connexions cross-platform"
    ];
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Méthodes de monitoring
  getActiveTasks() {
    return Array.from(this.activeTasks.values());
  }

  getTaskHistory(limit = 50) {
    return this.taskHistory.slice(-limit);
  }

  getTaskStats() {
    const total = this.taskHistory.length;
    const completed = this.taskHistory.filter(t => t.status === 'completed').length;
    const failed = this.taskHistory.filter(t => t.status === 'failed').length;
    
    return {
      total,
      completed,
      failed,
      successRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      activeTasks: this.activeTasks.size
    };
  }
}

module.exports = TaskOrchestrator;