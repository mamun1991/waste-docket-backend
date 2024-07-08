import {Server} from 'socket.io';

export default function initSocket() {
  const inboundServer = new Server({
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: 1e10,
  });
  const outboundServer = new Server({
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    maxHttpBufferSize: 1e10,
  });

  outboundServer.on('connection', async socket => {
    console.log('Current Sockets: ', await outboundServer.allSockets());
    console.log('new outbound connection', socket.id);

    socket.on('send_alert', deviceId => {
      inboundServer.emit(`toggle_pcd/${deviceId}`);
    });

    socket.on('request_single_pcd', deviceId => {
      inboundServer.emit(`request_single_pcd/${deviceId}`);
    });

    socket.on('error', error => console.log('outbound socket error: ', error));
    socket.on('disconnect', reason => console.log('outbound socket disconnected: ', reason));
  });

  inboundServer.on('connection', async socket => {
    console.log('Current Sockets: ', await inboundServer.allSockets());
    console.log('new inbound connection', socket.id);

    socket.on('error', error => console.log('inbound socket error: ', error));
    socket.on('disconnect', reason => console.log('inbound socket disconnected: ', reason));

    socket.on('tracks_data', track => {
      outboundServer.emit(`tracks_outbound/${track.deviceId}`, track.data);
    });

    socket.on('pcd_data', pcd => {
      outboundServer.emit(`pcd_outbound/${pcd.deviceId}`, pcd.data);
    });

    socket.on('send_single_pcd', pcd => {
      outboundServer.emit(`pcd_outbound/${pcd.deviceId}`, pcd.data);
    });
  });

  inboundServer.listen(4001);
  outboundServer.listen(4002);
}
