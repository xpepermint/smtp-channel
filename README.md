![Build Status](https://travis-ci.org/xpepermint/smtp-channel.svg?branch=master)&nbsp;[![NPM Version](https://badge.fury.io/js/smtp-channel.svg)](https://badge.fury.io/js/smtp-channel)&nbsp;[![Dependency Status](https://gemnasium.com/xpepermint/smtp-channel.svg)](https://gemnasium.com/xpepermint/smtp-channel)

# smtp-channel

> Low level SMTP communication layer.

This is an open source [npm](http://npmjs.com) package from [Node.js](http://nodejs.org). The source code is available on [GitHub](https://github.com/xpepermint/smtp-channel) where you can also find our [issue tracker](https://github.com/xpepermint/smtp-channel/issues).

## Related Projects

* [smtp-client](https://github.com/xpepermint/smtp-client): Simple, promisified, protocol-based SMTP client.

## Install

```
$ npm install --save smtp-channel
```

## Example

```js
import {SMTPChannel} from 'smtp-channel';

(async function() {
  let handler = console.log;

  let smtp = new SMTPChannel({
    host: 'mx.domain.com',
    port: 25
  });

  await s.connect({handler, timeout: 3000});
  await s.write('EHLO mx.me.com\r\n', {handler});
  await s.write('QUIT\r\n', {handler});

})().catch(console.error);
```

## API

**SMTPChannel(options)**

> The core SMTP class. This class passes options directly to the [net.connect](https://nodejs.org/api/net.html#net_net_connect_options_connectlistener) or  [tls.connect](https://nodejs.org/api/tls.html#tls_tls_connect_options_callback) methods. Custom available options are listed below.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| secure | Boolean | No | false | When `true` the channel will connect to the SMTP server using TLS.
| timeout | Integer | No | 0 | A time in milliseconds after the socket is automatically closed (`0` disables the timeout).

**SMTPChannel.prototype.close({timeout})**:Promise;

> Destroys the socket and ensures that no more I/O activity happens on this socket.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| timeout | Integer | No | 0 | A time in milliseconds after the operation automatically rejects (`0` disables the timeout).

**SMTPChannel.prototype.connect({handler, timeout})**:Promise;

> Connects to the SMTP server and starts socket I/O activity.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| handler | Function|Promise | No | - | A method for handling SMTP server replies.
| timeout | Integer | No | 0 | A time in milliseconds after the operation automatically rejects (`0` disables the timeout).

**SMTPChannel.prototype.isLastReply(line)**:String;

> A helper method which returns `true` if the provided `line` represents the last reply from the SMTP server.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| line | String | Yes | - | Server reply string.

**SMTPChannel.prototype.isSecure()**:Boolean;

> Returns `true` if the connection is secured over TLS.

**SMTPChannel.prototype.negotiateTLS(options)**:Promise;

> Upgrades the existing socket connection to TLS. This method should be used after sending the `STARTTLS` command. The method accepts `options` which are sent directly to the [tls.connect](https://nodejs.org/api/tls.html#tls_tls_connect_options_callback) method (existing class options are overriden). Custom options are listed below.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| timeout | Integer | No | 0 | A time in milliseconds after the operation automatically rejects (`0` disables the timeout).

**SMTPChannel.prototype.parseReplyCode(line)**:String;

> A helper method which returns a reply code of the provided `line`.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| line | String | Yes | - | Server reply string.

**SMTPChannel.prototype.write(data, {handler, timeout})**:Promise;

> Sends data on the socket.

| Option | Type | Required | Default | Description
|--------|------|----------|---------|------------
| data | String,Stream,Buffer | Yes | - | Data to be sent to the SMTP server. Make sure that you apply to the SMTP rules and complete lines with `\r\n`. When sending email data stream, make sure you include the `.` as the last line.
| handler | Function,Promise | No | - | A method for handling SMTP server replies.
| timeout | Integer | No | 0 | A time in milliseconds after the operation automatically rejects (`0` disables the timeout).

**Event: close**: () => {}

> Emitted once the socket is fully closed.

**Event: command**: (line) => {}

> Emitted when a line of data is sent to the SMTP server.

| Argument | Type | Description
|----------|------|------------
| line | String | Client command string.

**Event: connect**: () => {}

> Emitted when a socket connection is successfully established.

**Event: end**: () => {}

> Emitted when the other end of the socket sends a FIN packet. This means that the socket is about to close.

**Event: error**: (error) => {}

> Emitted when an error occurs. The 'close' event will be called directly following this event.

| Argument | Type | Description
|----------|------|------------
| error | Error | Error object.

**Event: receive**: (chunk) => {}

> Emitted when a chunk of data is received from the SMTP server.

| Argument | Type | Description
|----------|------|------------
| chunk | Buffer,String | A chunk of data.

**Event: reply**: (line) => {}

> Emitted when a new reply from the server is received.

| Argument | Type | Description
|----------|------|------------
| line | String | SMTP server reply string.

**Event: send**: (chunk) => {}

> Emitted when a chunk of data is sent to the SMTP server.

| Argument | Type | Description
|----------|------|------------
| chunk | Buffer,String | A chunk of data.

**Event: timeout**: () => {}

> Emitted if the socket times out from inactivity. The timeout event automatically sends the `QUIT` SMTP command.

## License (MIT)

```
Copyright (c) 2016 Kristijan Sedlak <xpepermint@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
```
