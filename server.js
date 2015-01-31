// MD coding challenge

// Define common attributes and requirements
var cluster = require('cluster');
var mongoose = require('mongoose');
var config = require('./app/config');
var Job = require('./app/jobModel');
var Queue = require('./app/queueClass');
var maxJobId = 0;

// Establish db connection - common to master and children
var db = mongoose.connect(config.db.url, function(err) {
  if (err) {
    console.log(err);
  }
  else {
    console.log('MongoDB connection established to ' + config.db.url);
  }
});

// Define all code for the master instance in here
if (cluster.isMaster) {

  var app = require('express')();

  // Morgan - logs http requests for debugging
  var morgan = require('morgan');
  app.use(morgan('dev'));

  // Instantiate the job queue (see queue class file)
  var queue = new Queue();

  // Sets JobId for next job (see utility function at bottom)
  setMaxJobId();

  /** ROUTES: Not quite enough to go in their own router file at this stage **/

  // Adds a new job. In practice, this should be a 'POST' route to demonstrate intent,
  // but using a GET route here for simple in-browser testing
  app.get('/job/add', function(req, res){

    var job = {
      job_id: maxJobId++,
      status: 'Queued'
    };

    new Job({
      job_id: job.job_id,
      status: job.status
    })
      .save(function(err){
        if (err)
          res.send('An error occurred: ' + JSON.stringify(err));

        queue.enqueue(job);

        var worker = cluster.fork();
        worker.send(queue.dequeue());

        res.send('Job ' + job.job_id + ' queued for processing');

      });
  });

  // Fetches job status for an individual job id
  app.get('/job/:jobId/status', function(req, res){

    Job.findOne({job_id: req.params.jobId}, function(err, job) {

      if (!job) {
        res.status(404).send('Job not found');
      }

      else {
        res.json(job.status);
      }

    });

  });

  // Fetches results from database for an individual job id
  app.get('/job/:jobId/results', function(req, res) {

    Job.findOne({job_id: req.params.jobId}, function(err, job) {

      if (!job) {
        res.status(404).send('No job found');
      }

      else if (job.status !== 'Finished') {
        res.send('Job not yet finished');
      }

      else {
        res.json(job.result);
      }
    });
  });

  // Start our master listening for requests on 8080
  app.listen(8080);


// Workers go here
} else {

  // Workers use the request Node.js library to fetch URL content
  var request = require('request');

  var job = null;

  // Listens for job message from master, and processes 'queued' jobs
  process.on('message', function(job) {

    if (job.status === 'Queued') {
      fetchData(job);
    } else {
      console.log('Nothing to do here. Exiting.');
      cluster.worker.disconnect();
    }

    console.log(job);

  });

  // Worker utility function for fetching data and saving to the DB
  function fetchData(job) {

    request(config.url, function (error, response, body) {

      if (!error && response.statusCode == 200) {
        Job.findOne({job_id: job.job_id}, function(err, model) {

          if (!model || err) {
            console.log('Error or not found');
          } else {
            model.status = 'Finished';
            model.result = body;
            model.save();
          }

          cluster.worker.disconnect();

        });
      }

    });

  };

}

// This utility function works around Mongo's lack of field increment support
function setMaxJobId() {
  Job.findOne({})
     .sort('-job_id')
     .exec(function(err, job){
      if (job) {
        maxJobId = job.job_id + 1;
      } else {
        maxJobId = 1;
      }
     });
};
