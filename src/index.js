const net = require('net');
// import tls from 'tls';
const stream = require('stream');
const {EventEmitter} = require('events');
const {LineBuffer} = require('line-buffer');
const promiseWithTimeout = require('promised-timeout').timeout;

exports.SMTPChannel = class extends EventEmitter {

  /*
  * Class constructor.
  */

  constructor(config={}) {
    super();

    this._config = Object.assign({
      host: 'localhost',
      port: 25,
      timeout: 0 // no timeout
    }, config); // class and socket configuration

    this._socket = null; // the socket connecting to the server
    this._buffer = new LineBuffer(); // for reading socket data in lines
  }

  /*
  * Returns a Promise which connects to the SMTP server and starts socket
  * I/O activity. We can abort the operating after a certain number of
  * milliseconds by passing the optional `timeout` parameter. We can also read
  * server replies by passing the `handler`.
  */

  connect({handler=null, timeout=0}={}) {
    return promiseWithTimeout({
      time: timeout,
      promise: this._connectAsPromised({handler}),
      error: new Error('connect operation timeout')
    });
  }

  /*
  * Returns a Promise which destroys the socket and ensures that no more I/O
  * activity happens on this socket. We can abort the operating after a certain
  * time of milliseconds by passing the optional `timeout` parameter.
  */

  close({timeout=0}={}) {
    return promiseWithTimeout({
      time: timeout,
      promise: this._closeAsPromised(),
      error: new Error('close operation timeout')
    });
  }

  /*
  * Returns a promise which sends a new command to the SMTP server. The `data`
  * attribute can be a string or a stream. We can abort the operating after a
  * certain number of milliseconds by passing the optional `timeout` parameter.
  * We can also read server replies by passing the `handler`.
  */

  write(data, {handler=null, timeout=0}={}) {
    return promiseWithTimeout({
      time: timeout,
      promise: this._writeAsPromised(data, {handler}),
      error: new Error('close operation timeout')
    });
  }

  /*
  * Returns a Promise which connects to the SMTP server and starts socket
  * I/O activity.
  *
  * NOTES: Normally, a receiver will send a 220 "Service ready" reply when the
  * connection is completed. The sender should wait for this greeting message
  * before sending any commands.
  */

  _connectAsPromised({handler}) {
    return new Promise((resolve, reject) => {
      if (this._socket) {
        return resolve();
      }

      this._socket = net.connect(this._config, () => { // when connection to the server succeeds
        this._socket.removeAllListeners('error');
        this._socket.on('close', this._onClose.bind(this));
        this._socket.on('data', this._onData.bind(this));
        this._socket.on('end', this._onEnd.bind(this));
        this._socket.on('error', this._onError.bind(this));
        this._socket.on('timeout', this._onTimeout.bind(this));
        this._socket.setEncoding('utf8');
        this._socket.setTimeout(this._config.timeout);
        this._buffer.on('reply', this._onReply.bind(this));
        this._onConnect();
      });

      this._resolveCommand({resolve, reject, handler});
    });
  }

  /*
  * Returns a Promise which destroys the socket and ensures that no more I/O
  * activity happens on this socket.
  */

  _closeAsPromised() {
    return new Promise((resolve, reject) => {
      if (!this._socket) {
        return resolve();
      }

      this._socket.once('close', resolve);
      this._socket.destroy();

      this._socket = null;
    });
  }

  /*
  * Returns a promise which sends a new command to the SMTP server. The `data`
  * attribute can be a string or a stream.
  */

  _writeAsPromised(data, {handler}) {
    return new Promise((resolve, reject) => {
      if (!this._socket) {
        return reject(new Error('no connection to execute a write operation'));
      }

      this._resolveCommand({resolve, reject, handler});
      this._convertToStream(data).pipe(this._socket, {end: false});
    });
  }

  /*
  * Handles the time between the command, sent to the server, and the last reply
  * from the SMTP server. When the last reply from the server is received, the
  * `resolve` method is called. In case of an error, the `reject` method is
  * triggered instead. We can provide an optional `handler` method/promise
  * which will be triggered on each reply (line) from the server.
  */

  _resolveCommand({resolve, reject, handler=null}) { // handling request

    let onError = (error) => { // socket write error
      this._buffer.removeListener('line', onLine);
      reject(error);
    };

    let onLine = (line) => { // handling replies
      let isLast = this._isLastReply(line);
      let code = this._parseReplyCode(line);
      let isSuccess = this._isSuccessReplyCode(code);

      Promise.resolve(line, {code, isLast, isSuccess})
        .then(handler)
        .then(() => {if (isLast) resolve(code)});

      if (isLast) {
        this._socket.removeListener('error', onError);
        this._buffer.removeListener('line', onLine);
      }
    };

    this._socket.once('error', onError);
    this._buffer.on('line', onLine);
  }

  /*
  * Converts the `data` (string, buffer or stream) into Readable stream.
  */

  _convertToStream(data) {
    if (data.pipe) {
      return data;
    }

    let chars = data.split('')
    return new stream.Readable({
      read: function(size) {
        this.push(chars.shift());
      }
    });
  }

  /*
  * A handler which is triggered once the socket is fully closed.
  */

  _onClose() {
    this.emit('close');
  }

  /*
  * A handler which is triggered when a socket connection is established.
  */

  _onConnect() {
    this.emit('connect');
  }

  /*
  * A handler which is triggered when a chunk of data is received from the
  * SMTP server.
  */

  _onData(chunk) {
    this.emit('data', chunk);

    this._buffer.feed(chunk); // feed the buffer with server replies
  }

  /*
  * Emitted when the other end of the socket sends a FIN packet. This means that
  * the socket is about to be closed.
  */

  _onEnd() {
    this.emit('end');
  }

  /*
  * A handler which is triggered on socket error.
  */

  _onError(error) {
    this.emit('error', error);
  }

  /*
  * A handler which is triggered on each reply from the server.
  */

  _onReply(line) {
    let isLast = this._isLastReply(line);
    let code = this._parseReplyCode(line);
    let isSuccess = this._isSuccessReplyCode

    this.emit('reply', line, {code, isLast, isSuccess});
  }

  /*
  * A handler which is triggered if the socket times out from inactivity.
  */

  _onTimeout() {
    this.emit('timeout');

    this.write('QUIT\r\n'); // automatically disconnects
  }

  /*
  * Returns the reply code of the provided reply line.
  *
  * NOTES: According to the rfc5321 specification, the line will always begin
  * with the reply code.
  */

  _parseReplyCode(line) {
    return line.substr(0, 3);
  }

  /*
  * Returns `true` if the provided reply line represents the last reply from the
  * SMTP server.
  *
  * NOTE: According to the rfc5321 specification, the last line will begin with
  * the reply code, followed immediately by <SP>.
  */

  _isLastReply(line) {
    return line.charAt(3) === ' ';
  }

  /*
  * Returns `true` if the provided reply code represents a success code.
  *
  * NOTE: According to the rfc821 specification, the 2xx codes represent a
  * positive completion reply which means that the requested action has been
  * successfully completed and a new request may be initiated.
  */

  _isSuccessReplyCode(code) {
    return code.charAt(0) === '2';
  }

}
