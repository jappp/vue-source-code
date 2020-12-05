// 异步任务队列 
const queue = [] 
// 队列任务执行完后执行的回调函数队列 
const postFlushCbs = [] 
function queueJob(job) { 
  if (!queue.includes(job)) { 
    queue.push(job) 
    queueFlush() 
  } 
} 
function queuePostFlushCb(cb) { 
  if (!isArray(cb)) { 
    postFlushCbs.push(cb) 
  } 
  else { 
    // 如果是数组，把它拍平成一维 
    postFlushCbs.push(...cb) 
  } 
  queueFlush() 
} 

const p = Promise.resolve() 
// 异步任务队列是否正在执行 
let isFlushing = false 
// 异步任务队列是否等待执行 
let isFlushPending = false 
function nextTick(fn) { 
  return fn ? p.then(fn) : p 
} 
function queueFlush() { 
  if (!isFlushing && !isFlushPending) { 
    isFlushPending = true 
    nextTick(flushJobs) 
  } 
} 

const getId = (job) => (job.id == null ? Infinity : job.id) 
function flushJobs(seen) { 
  isFlushPending = false 
  isFlushing = true 
  let job 
  if ((process.env.NODE_ENV !== 'production')) { 
    seen = seen || new Map() 
  } 
  // 组件的更新是先父后子 
  // 如果一个组件在父组件更新过程中卸载，它自身的更新应该被跳过 
  queue.sort((a, b) => getId(a) - getId(b)) 
  while ((job = queue.shift()) !== undefined) { 
    if (job === null) { 
      continue 
    } 
    if ((process.env.NODE_ENV !== 'production')) { 
      checkRecursiveUpdates(seen, job) 
    } 
    callWithErrorHandling(job, null, 14 /* SCHEDULER */) 
  } 
  flushPostFlushCbs(seen) 
  isFlushing = false 
  // 一些 postFlushCb 执行过程中会再次添加异步任务，递归 flushJobs 会把它们都执行完毕 
  if (queue.length || postFlushCbs.length) { 
    flushJobs(seen) 
  } 
} 

function flushPostFlushCbs(seen) { 
  if (postFlushCbs.length) { 
    // 拷贝副本 
    const cbs = [...new Set(postFlushCbs)] 
    postFlushCbs.length = 0 
    if ((process.env.NODE_ENV !== 'production')) { 
      seen = seen || new Map() 
    } 
    for (let i = 0; i < cbs.length; i++) { 
      if ((process.env.NODE_ENV !== 'production')) {                                                       
        checkRecursiveUpdates(seen, cbs[i]) 
      } 
      cbs[i]() 
    } 
  } 
} 

const RECURSION_LIMIT = 100 
function checkRecursiveUpdates(seen, fn) { 
  if (!seen.has(fn)) { 
    seen.set(fn, 1) 
  } 
  else { 
    const count = seen.get(fn) 
    if (count > RECURSION_LIMIT) { 
      throw new Error('Maximum recursive updates exceeded. ' + 
        "You may have code that is mutating state in your component's " + 
        'render function or updated hook or watcher source function.') 
    } 
    else { 
      seen.set(fn, count + 1) 
    } 
  } 
} 

function queueFlush() { 
  if (!isFlushing) { 
    isFlushing = true 
    nextTick(flushJobs) 
  } 
} 
function flushJobs(seen) { 
  let job 
  if ((process.env.NODE_ENV !== 'production')) { 
    seen = seen || new Map() 
  } 
  queue.sort((a, b) => getId(a) - getId(b)) 
  while ((job = queue.shift()) !== undefined) { 
    if (job === null) { 
      continue 
    } 
    if ((process.env.NODE_ENV !== 'production')) { 
      checkRecursiveUpdates(seen, job) 
    } 
    callWithErrorHandling(job, null, 14 /* SCHEDULER */) 
  } 
  flushPostFlushCbs(seen) 
  if (queue.length || postFlushCbs.length) { 
    flushJobs(seen) 
  } 
  isFlushing = false 
} 

function watchEffect(effect, options) { 
  return doWatch(effect, null, options); 
} 
function doWatch(source, cb, { immediate, deep, flush, onTrack, onTrigger } = EMPTY_OBJ) { 
  instance = currentInstance; 
  let getter; 
  if (isFunction(source)) { 
    getter = () => { 
      if (instance && instance.isUnmounted) { 
        return; 
      } 
       // 执行清理函数 
      if (cleanup) { 
        cleanup(); 
      } 
      // 执行 source 函数，传入 onInvalidate 作为参数 
      return callWithErrorHandling(source, instance, 3 /* WATCH_CALLBACK */, [onInvalidate]); 
    }; 
  } 
  let cleanup; 
  const onInvalidate = (fn) => { 
    cleanup = runner.options.onStop = () => { 
      callWithErrorHandling(fn, instance, 4 /* WATCH_CLEANUP */); 
    }; 
  }; 
  let scheduler; 
  // 创建 scheduler 
  if (flush === 'sync') { 
    scheduler = invoke; 
  } 
  else if (flush === 'pre') { 
    scheduler = job => { 
      if (!instance || instance.isMounted) { 
        queueJob(job); 
      } 
      else { 
        job(); 
      } 
    }; 
  } 
  else { 
    scheduler = job => queuePostRenderEffect(job, instance && instance.suspense); 
  } 
  // 创建 runner 
  const runner = effect(getter, { 
    lazy: true, 
    computed: true, 
    onTrack, 
    onTrigger, 
    scheduler 
  }); 
  recordInstanceBoundEffect(runner); 
  // 立即执行 runner 
  runner(); 
  // 返回销毁函数 
  return () => { 
    stop(runner); 
    if (instance) { 
      remove(instance.effects, runner); 
    } 
  }; 
} 
