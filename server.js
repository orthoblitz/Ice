const fs = require('fs');
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

const PORT = process.env.PORT || 3000;
const messageFile = path.join(__dirname, 'messages.json');

app.use(express.static('public'));
app.get('/', (req, res) => res.sendFile(__dirname + '/public/index.html'));

let users = {};
let messageHistory = [];

try {
  if (fs.existsSync(messageFile)) {
    messageHistory = JSON.parse(fs.readFileSync(messageFile, 'utf8'));
  }
} catch (err) {
  console.error('Error loading messages:', err);
}

io.on('connection', socket => {
  socket.emit('chat history', messageHistory);

  socket.on('join', username => {
    users[socket.id] = username;
    io.emit('system message', `${username} joined the chat`);
    io.emit('user list', Object.values(users));
  });

  socket.on('disconnect', () => {
    const username = users[socket.id];
    if (username) {
      delete users[socket.id];
      io.emit('system message', `${username} left the chat`);
      io.emit('user list', Object.values(users));
    }
  });

  socket.on('chat message', data => {
    const msg = {
      user: data.user,
      message: data.message,
      timestamp: data.timestamp || Date.now()
    };
    messageHistory.push(msg);
    fs.writeFile(messageFile, JSON.stringify(messageHistory, null, 2), () => {});
    io.emit('chat message', msg);
  });

  socket.on('typing', data => {
    socket.broadcast.emit('typing', data);
  });
});

http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
