import { io, Socket } from 'socket.io-client';
import { useIncidentStore } from '../store/incidentStore';
import notificationService from '../services/notificationService';

const SOCKET_URL = 'https://core.alerionalert.com';

let socket: Socket | null = null;

export const initSocket = () => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('Socket connected');
  });

  socket.on('disconnect', () => {
    console.log('Socket disconnected');
  });

  socket.on('incident:new', (incident) => {
    console.log('New incident:', incident._id);
    useIncidentStore.getState().addIncident(incident);
    
    // Send push notification for new incident
    notificationService.notifyNewIncident(incident);
  });

  socket.on('incident:update', (incident) => {
    console.log('Incident updated:', incident._id);
    const store = useIncidentStore.getState();
    const existingIncident = store.incidents.find(i => i._id === incident._id);
    
    // Only notify if there's a new update
    if (existingIncident && incident.updates?.length > (existingIncident.updates?.length || 0)) {
      notificationService.notifyIncidentUpdate(incident);
    }
    
    store.updateIncident(incident);
  });

  socket.on('incident:archive', ({ id }) => {
    console.log('Incident archived:', id);
    useIncidentStore.getState().removeIncident(id);
  });

  socket.on('eas:new', (alert) => {
    console.log('New EAS alert:', alert.id);
    useIncidentStore.getState().addEASAlert(alert);
    
    // Send push notification for new EAS alert
    notificationService.notifyNewEAS(alert);
  });

  socket.on('eas:deleted', ({ id }) => {
    console.log('EAS deleted:', id);
    useIncidentStore.getState().removeEASAlert(id);
  });

  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;
