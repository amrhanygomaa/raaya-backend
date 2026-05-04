const http = require('http');
const https = require('https');

exports.handler = async () => {
  const backendUrl = process.env.BACKEND_URL;
  const jobSecret = process.env.JOB_SECRET;

  if (!backendUrl || !jobSecret) {
    return {
      statusCode: 500,
      body: 'BACKEND_URL and JOB_SECRET are required',
    };
  }

  const urlObj = new URL('/jobs/weekly-ai-summary', backendUrl);
  const client = urlObj.protocol === 'https:' ? https : http;

  return new Promise((resolve, reject) => {
    const req = client.request(
      {
        hostname: urlObj.hostname,
        port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'x-job-secret': jobSecret,
          'Content-Type': 'application/json',
        },
      },
      (res) => {
        console.log('Status:', res.statusCode);
        resolve({ statusCode: res.statusCode });
      },
    );

    req.on('error', reject);
    req.end();
  });
};
