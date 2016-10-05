const test = require('ava');
const stream = require('stream');
const fs = require('fs');
const MailDev = require('maildev');
const {SMTPChannel} = require('../src');

let server = new MailDev({
  autoRelayRules: [{ "allow": "*" }]
});

test.serial.cb.beforeEach((t) => {
  server.listen(t.end);
});

test.serial.cb.afterEach((t) => {
  server.end(t.end);
});

test.serial('should connect to and disconnect from the server', async (t) => {
  let c = new SMTPChannel({port: 1025});

  let connectReplies = []
  let connectCode = await c.connect({
    handler: (line) => connectReplies.push(line)
  });

  t.is(connectReplies.length, 1);
  t.is(connectCode, '220');

  await c.close();
});

test.serial('`write` should send data to the server', async (t) => {
  let c = new SMTPChannel({port: 1025});
  await c.connect();

  let writeReplies = []
  let writeCode = await c.write('EHLO domain.com\r\n', {
    handler: (line) => writeReplies.push(line)
  });

  t.is(writeReplies.length, 5);
  t.is(writeCode, '250');

  await c.close();
});

test.serial('`write` should stream data to the server', async (t) => {
  let c = new SMTPChannel({port: 1025});
  await c.connect();

  let command = 'EHLO domain.com\r\n'.split('');
  let dataStream = new stream.Readable({
    read: function(size) { this.push(command.shift()) }
  });
  let writeReplies = []
  let writeCode = await c.write(dataStream, {
    handler: (line) => writeReplies.push(line)
  });
  t.is(writeReplies.length, 5);
  t.is(writeCode, '250');

  await c.close();
});

test.serial('`startTLS` should upgrade the existing socket to TLS', async (t) => {
  let c = new SMTPChannel({port: 1025});
  await c.connect();
  await c.write('EHLO domain.com\r\n');
  await c.write('STARTTLS\r\n');
  await c.negotiateTLS({
    rejectUnauthorized: false
  });

  let writeReplies = [];
  let writeCode = await c.write('EHLO domain.com\r\n', {
    handler: (line) => writeReplies.push(line)
  });

  t.is(writeReplies.length, 4);
  t.is(writeCode, '250');
  t.is(writeReplies.filter(r => r.substr(4) === 'STARTTLS').length, 0);

  await c.close();
});
