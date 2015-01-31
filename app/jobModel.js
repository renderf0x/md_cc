// Defines the database model for a Job

var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var jobSchema = new Schema({
  job_id: Number,
  status: String,
  result: String
});

module.exports = mongoose.model('Job', jobSchema);
