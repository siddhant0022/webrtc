const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serve static files from "public" directory (like HTML, CSS, JS)
app.use(express.static('public'));

// Waiting user for random matchmaking
let waitingUser = null;

// All connected users (optional - useful for debugging or future features)
const users = new Map();

// When a user connects
io.on('connection', socket => {
  console.log('User connected:', socket.id);
  users.set(socket.id, socket);

  // Random matchmaking logic
  socket.on('findPeer', () => {
    console.log(`[${socket.id}] is finding a peer`);

    // If another user is waiting, pair them
    if (waitingUser && waitingUser.id !== socket.id) {
      const peerSocket = waitingUser;
      waitingUser = null;

      // Inform both users about each other
      socket.emit('match', { peerSocketId: peerSocket.id, isInitiator: true });
      peerSocket.emit('match', { peerSocketId: socket.id, isInitiator: false });

      console.log(`Paired: ${socket.id} <--> ${peerSocket.id}`);
    } else {
      // No one waiting, add this user to the queue
      waitingUser = socket;
      console.log(`[${socket.id}] is now waiting for a match`);
    }
  });

  // Relay offer to specific peer
  socket.on('offer', ({ offer, to }) => {
    console.log(`Offer from ${socket.id} to ${to}`);
    io.to(to).emit('offer', { offer, from: socket.id });
  });

  // Relay answer to specific peer
  socket.on('answer', ({ answer, to }) => {
    console.log(`Answer from ${socket.id} to ${to}`);
    io.to(to).emit('answer', { answer });
  });

  // Relay ICE candidates to specific peer
  socket.on('candidate', ({ candidate, to }) => {
    io.to(to).emit('candidate', { candidate });
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    
    // If this was the waiting user, remove from queue
    if (waitingUser && waitingUser.id === socket.id) {
      waitingUser = null;
    }

    // Remove from user list
    users.delete(socket.id);
  });
});

// Start server
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
