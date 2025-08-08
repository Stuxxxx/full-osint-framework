const Investigation = {
  id: String,
  title: String,
  description: String,
  services_used: [String],
  results: {
    telegram: Object,
    socialMedia: Object,
    webIntel: Object
  },
  created_at: Date,
  updated_at: Date
};
