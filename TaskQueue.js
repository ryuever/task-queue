/**
 * TaskQueue - A system for queueing and executing a mix of simple callbacks and
 * trees of dependent tasks based on Promises. No tasks are executed unless
 * `processNext` is called.
 *
 * `enqueue` takes a Task object with either a simple `run` callback, or a
 * `gen` function that returns a `Promise` and puts it in the queue.  If a gen
 * function is supplied, then the promise it returns will block execution of
 * tasks already in the queue until it resolves. This can be used to make sure
 * the first task is fully resolved (including asynchronous dependencies that
 * also schedule more tasks via `enqueue`) before starting on the next task.
 * The `onMoreTasks` constructor argument is used to inform the owner that an
 * async task has resolved and that the queue should be processed again.
 *
 * Note: Tasks are only actually executed with explicit calls to `processNext`.
 */

const infoLog = console
const DEBUG = false

class TaskQueue {
  /**
   * TaskQueue instances are self contained and independent, so multiple tasks
   * of varying semantics and priority can operate together.
   *
   * `onMoreTasks` is invoked when `PromiseTask`s resolve if there are more
   * tasks to process.
   */
  constructor({onMoreTasks}) {
    this._onMoreTasks = onMoreTasks;
    this._queueStack = [{tasks: [], popable: false}];
  }

  /**
   * Add a task to the queue.  It is recommended to name your tasks for easier
   * async debugging. Tasks will not be executed until `processNext` is called
   * explicitly.
   */
  enqueue(task) {
    this._getCurrentQueue().push(task);
  }

  enqueueTasks(tasks) {
    tasks.forEach(task => this.enqueue(task));
  }

  cancelTasks(tasksToCancel) {
    // search through all tasks and remove them.
    this._queueStack = this._queueStack
      .map(queue => ({
        ...queue,
        tasks: queue.tasks.filter(task => tasksToCancel.indexOf(task) === -1),
      }))
      .filter((queue, idx) => queue.tasks.length > 0 || idx === 0);
  }

  /**
   * Check to see if `processNext` should be called.
   *
   * @returns {boolean} Returns true if there are tasks that are ready to be
   * processed with `processNext`, or returns false if there are no more tasks
   * to be processed right now, although there may be tasks in the queue that
   * are blocked by earlier `PromiseTask`s that haven't resolved yet.
   * `onMoreTasks` will be called after each `PromiseTask` resolves if there are
   * tasks ready to run at that point.
   */
  hasTasksToProcess() {
    return this._getCurrentQueue().length > 0;
  }

  /**
   * Executes the next task in the queue.
   */
  processNext() {
    const queue = this._getCurrentQueue();
    if (queue.length) {
      const task = queue.shift();
      try {
        if (task.gen) {
          DEBUG && infoLog('genPromise for task ' + task.name);
          this._genPromise((task)); // Rather than annoying tagged union
        } else if (task.run) {
          DEBUG && infoLog('run task ' + task.name);
          task.run();
        } else {
          // invariant(
          //   typeof task === 'function',
          //   'Expected Function, SimpleTask, or PromiseTask, but got:\n' +
          //     JSON.stringify(task, null, 2),
          // );
          DEBUG && infoLog('run anonymous task');
          task();
        }
      } catch (e) {
        e.message =
          'TaskQueue: Error with task ' + (task.name || '') + ': ' + e.message;
        throw e;
      }
    }
  }


  _getCurrentQueue() {
    const stackIdx = this._queueStack.length - 1;
    const queue = this._queueStack[stackIdx];
    if (
      queue.popable &&
      queue.tasks.length === 0 &&
      this._queueStack.length > 1
    ) {
      this._queueStack.pop();
      DEBUG &&
        infoLog('popped queue: ', {
          stackIdx,
          queueStackSize: this._queueStack.length,
        });
      return this._getCurrentQueue();
    } else {
      return queue.tasks;
    }
  }

  _genPromise(task) {
    // Each async task pushes it's own queue onto the queue stack. This
    // effectively defers execution of previously queued tasks until the promise
    // resolves, at which point we allow the new queue to be popped, which
    // happens once it is fully processed.
    this._queueStack.push({tasks: [], popable: false});
    const stackIdx = this._queueStack.length - 1;
    DEBUG && infoLog('push new queue: ', {stackIdx});
    DEBUG && infoLog('exec gen task ' + task.name);
    task
      .gen()
      .then(() => {
        DEBUG &&
          infoLog('onThen for gen task ' + task.name, {
            stackIdx,
            queueStackSize: this._queueStack.length,
          });
        this._queueStack[stackIdx].popable = true;
        this.hasTasksToProcess() && this._onMoreTasks();
      })
//       .catch(ex => {
//         ex.message = `TaskQueue: Error resolving Promise in task ${
//           task.name
//         }: ${ex.message}`;
//         throw ex;
//       })
//       .done();
  }
}

const update = () => {
  console.log('update')
  setTimeout(() => task.processNext(), 1000)
}
const task = new TaskQueue({ onMoreTasks: update })

for (let i = 0; i < 10; i++) {
  console.log('xx')
  if (i % 2) {
  task.enqueue({
      gen: () => {
          task.enqueue(() => {
              debugger
              console.log('gen ', i)
              task.processNext()
          })
          return new Promise(resolve => {
              setTimeout(resolve, 1000)
            })
      }
  })
  } else {
      task.enqueue(() => {
          console.log('i : ', i)
          task.processNext()
         })

  }
}

update()