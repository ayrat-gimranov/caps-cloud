'use strict';

const faker = require('faker');
const { Producer } = require('sqs-producer');
const { Consumer } = require('sqs-consumer');

const app = Consumer.create({
  queueUrl: 'https://sqs.eu-central-1.amazonaws.com/457441446271/packages.fifo',
  handleMessage: handler,
});

function handler(message) {
  console.log('\n ================= \x1b[33mUPS \x1b[37mGrabbed next delivery in the queue ===================')
}

app.on('message_processed', (message) => {
  app.stop();
  let result = JSON.parse(message.Body);
  let messageForDeliverySQS = JSON.parse(result['Message']);
  console.log(`PICKED UP package: `, { store: messageForDeliverySQS.store, customer: messageForDeliverySQS.customer, orderID: messageForDeliverySQS.orderID });

  const producer = Producer.create({
    queueUrl: messageForDeliverySQS.vendorID,
    region: 'eu-central-1'
  })

  setTimeout(async () => {
    try {
      const message = {
        id: faker.datatype.uuid(),
        body: `\n UPS DELIVERED for ${messageForDeliverySQS.customer}.`
      }
      const response = await producer.send(message);
      console.log('DRIVER: Сompleted delivery', { store: messageForDeliverySQS.store, customer: messageForDeliverySQS.customer, orderID: messageForDeliverySQS.orderID });
      app.emit('restart-poll');
    } catch (e) {
      console.error(e)
    }
  }, 7000)
})

app.on('restart-poll', () => {
  app.start();
})

app.on('error', (err) => {
  console.error(err.message);
});

app.on('processing_error', (err) => {
  console.error(err.message);
});


app.start();

