export class Queue {
  constructor() {}
  add = jest.fn();
  close = jest.fn();
}

export class QueueScheduler {
  constructor() {}
  close = jest.fn();
}

export class Worker {
  constructor() {}
  close = jest.fn();
}
