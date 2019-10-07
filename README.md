# task queue

## ProcessNext

看一下是否有符合条件的task

## push

触发task run？return a cancellable token, no matter whether it is running. because we need return a cancellable token... so `push` should be a `sync task`. it just return a token...

## handle error

## Provider

waiting for job to push, once finish trigger next one; if not reach max, then run, or waiting for chance...

1. support `concurrency`
2. return `promise` or not

```js
if (p && p.then) // could be consider as promise
```

first promisify????

if it is a sync job, concurrency is impossible; thread is always busy...

## care the result or not ?????

## queue vs

1. no need to care result...It just need to trigger next job.