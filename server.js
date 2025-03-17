const express = require('express');
const app = express();
const port = process.env.PORT || 3000;

// Route to serve the single HTML page with inline CSS and JS.
app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>VPN Leak Check</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 2em;
      background-color: #f9f9f9;
    }
    h1 {
      color: #333;
    }
    button {
      padding: 0.5em 1em;
      font-size: 1em;
      cursor: pointer;
    }
    #results, #serverResult {
      margin-top: 1em;
      padding: 1em;
      background: #fff;
      border: 1px solid #ddd;
    }
    .ip {
      font-weight: bold;
      color: darkblue;
    }
  </style>
</head>
<body>
  <h1>VPN Leak Check</h1>
  <p>This tool tests for potential VPN leaks using WebRTC and shows your public IP as seen by our server.</p>
  <button id="startTest">Start Leak Test</button>
  <div id="results"></div>
  <div id="serverResult"></div>
  
  <script>
    // Helper function to add messages to a given element.
    function log(elementId, message) {
      const elem = document.getElementById(elementId);
      const para = document.createElement('p');
      para.innerHTML = message;
      elem.appendChild(para);
    }

    // Function to detect IP addresses using WebRTC.
    function detectIPs() {
      let ipDuplicates = {};
      const RTCPeerConnection = window.RTCPeerConnection ||
                                window.mozRTCPeerConnection ||
                                window.webkitRTCPeerConnection;
      if (!RTCPeerConnection) {
        log("results", "WebRTC is not supported by your browser.");
        return;
      }
      
      const pc = new RTCPeerConnection({ iceServers: [] });
      // Create a dummy data channel.
      pc.createDataChannel("");

      // Listen for candidate events.
      pc.onicecandidate = function(event) {
        if (!event || !event.candidate) {
          // No more candidates.
          pc.close();
          return;
        }
        // Extract IP address from candidate string.
        const candidate = event.candidate.candidate;
        const ipRegex = /([0-9]{1,3}(\\.[0-9]{1,3}){3})/;
        const ipMatch = candidate.match(ipRegex);
        if (ipMatch) {
          const ipAddr = ipMatch[1];
          if (!ipDuplicates[ipAddr]) {
            ipDuplicates[ipAddr] = true;
            log("results", "Detected IP: <span class='ip'>" + ipAddr + "</span>");
          }
        }
      };

      // Create an offer and set local description to trigger ICE gathering.
      pc.createOffer().then(offer => {
        return pc.setLocalDescription(offer);
      }).catch(error => {
        log("results", "Error during WebRTC offer creation: " + error);
      });
    }

    // Function to contact the backend server to get your public IP.
    function getServerIP() {
      fetch('/api/get-ip')
        .then(response => response.json())
        .then(data => {
          log("serverResult", "Your public IP as seen by the server is: <span class='ip'>" + data.ip + "</span>");
        })
        .catch(error => {
          log("serverResult", "Error fetching public IP from server: " + error);
        });
    }

    document.getElementById('startTest').addEventListener('click', function() {
      // Clear previous results.
      document.getElementById('results').innerHTML = "";
      document.getElementById('serverResult').innerHTML = "";
      log("results", "Starting WebRTC leak test...");
      detectIPs();
      log("serverResult", "Contacting server for public IP...");
      getServerIP();
    });
  </script>
</body>
</html>`);
});

// Endpoint to return the client's public IP as seen by the server.
app.get('/api/get-ip', (req, res) => {
  const ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
  res.json({ ip: ip });
});

// Start the server.
app.listen(port, () => {
  console.log(\`VPN Leak Check server running on port \${port}\`);
});
