// Queue definition
// Nothing special, just a simple queue implementation in JS

var Queue = function() {

  this.size = 0;
  this.head = null;
  this.tail = null;

};

Queue.prototype.enqueue = function(payload) {

  var node = new Node(payload);

  if (!this.head) {
    this.head = node;
    this.tail = node;
  } else {
    this.tail.next = node;
  }

  this.size++;

  function Node(payload, next) {
    this.payload = payload;
    this.next = next || null;
  }

};

Queue.prototype.dequeue = function() {

  if (!this.head) {
    return null;
  }

  var value = this.head.payload;
  this.head = this.head.next;
  this.size--;

  return value;

};

module.exports = Queue;
