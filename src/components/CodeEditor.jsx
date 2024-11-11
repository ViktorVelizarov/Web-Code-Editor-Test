import React, { useEffect, useState, useCallback } from 'react';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/material-ocean.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/keymap/sublime';
import CodeMirror from 'codemirror';
import io from 'socket.io-client';
import { Typography } from '@mui/material';
import { useStore } from '../store';
import debounce from 'lodash.debounce';

const RealTimeEditor = () => {
  const [users, setUsers] = useState([]);
  const { username, roomId } = useStore(({ username, roomId }) => ({
    username,
    roomId,
  }));
  
  // Create a ref to store the socket instance
  const socketRef = React.useRef(null);
  const editorRef = React.useRef(null);

  // Create a debounced function for emitting changes
  const debouncedEmit = useCallback(
    debounce((socket, code) => {
      console.log('Emitting debounced CODE_CHANGED event with code:', code);
      socket.emit('CODE_CHANGED', code);
    }, 100), // Adjust this delay as needed
    []
  );

  useEffect(() => {
    const editor = CodeMirror.fromTextArea(document.getElementById('ds'), {
      lineNumbers: true,
      keyMap: 'sublime',
      theme: 'material-ocean',
      mode: 'javascript',
    });

    editorRef.current = editor;

    const socket = io('https://collaborativecodeeditor-440923.lm.r.appspot.com/', {
      transports: ['websocket'],
    });

    socketRef.current = socket;

    // Connection event handlers
    socket.on('connect', () => {
      console.log('Connected to server');
      socket.emit('CONNECTED_TO_ROOM', { roomId, username });
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
      socket.emit('DISSCONNECT_FROM_ROOM', { roomId, username });
    });

    // Handle incoming code changes
    socket.on('CODE_CHANGED', (code) => {
      console.log('CODE_CHANGED event received with code:', code);
      const currentCursor = editor.getCursor();
      editor.setValue(code);
      editor.setCursor(currentCursor);
    });

    socket.on('ROOM:CONNECTION', (users) => {
      console.log('Updated users in room:', users);
      setUsers(users);
    });

    // Handle editor changes with debouncing
    editor.on('change', (instance, changes) => {
      const { origin } = changes;
      if (origin !== 'setValue') {
        debouncedEmit(socket, instance.getValue());
      }
    });

    // Cleanup function
    return () => {
      console.log('Cleaning up socket connection');
      // Cancel any pending debounced emissions
      debouncedEmit.cancel();
      // Clean up socket
      if (socket) {
        socket.emit('DISSCONNECT_FROM_ROOM', { roomId, username });
        socket.disconnect();
      }
      // Clean up editor
      if (editor) {
        editor.toTextArea();
      }
    };
  }, [roomId, username, debouncedEmit]);

  return (
    <>
      <Typography variant="h5">Your username is: {username}</Typography>
      <Typography variant="h5">The room ID is: {roomId}</Typography>
      <Typography variant="h5">
        How many people are connected: <b>{users.length}</b>
      </Typography>
      <textarea id="ds" />
    </>
  );
};

export default RealTimeEditor;