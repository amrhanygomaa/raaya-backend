const http = require('http');

exports.handler = async (event) => {
  const backendUrl = process.env.BACKEND_URL;
  const jobSecret = process.env.JOB_SECRET;
  
  const urlObj = new URL('/jobs/medication-reminder', backendUrl);
  
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'x-job-secret': jobSecret,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      console.log('Status:', res.statusCode);
      resolve({ statusCode: res.statusCode });
    });
    req.on('error', reject);
    req.end();
  });
};