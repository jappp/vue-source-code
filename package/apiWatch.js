function watch(source, cb, options) { 
  if ((process.env.NODE_ENV !== 'production') && !isFunction(cb)) { 
    warn(`\`watch(fn, options?)\` signature has been moved to a separate API. ` + 
      `Use \`watchEffect(fn, options?)\` instead. \`watch\` now only ` + 
      `supports \`watch(source, cb, options?) signature.`) 
  } 
  return doWatch(source, cb, options) 
} 
function doWatch(source, cb, { immediate, deep, flush, onTrack, onTrigger } = EMPTY_OBJ) { 
  // 标准化 source 
  // 构造 applyCb 回调函数 
  // 创建 scheduler 时序执行函数 
  // 创建 effect 副作用函数 
  // 返回侦听器销毁函数 
}
// source 不合法的时候会报警告 
const warnInvalidSource = (s) => { 
  warn(`Invalid watch source: `, s, `A watch source can only be a getter/effect function, a ref, ` + 
    `a reactive object, or an array of these types.`) 
} 
// 当前组件实例 
const instance = currentInstance 
let getter 
if (isArray(source)) { 
  getter = () => source.map(s => { 
    if (isRef(s)) { 
      return s.value 
    } 
    else if (isReactive(s)) { 
      return traverse(s) 
    } 
    else if (isFunction(s)) { 
      return callWithErrorHandling(s, instance, 2 /* WATCH_GETTER */) 
    } 
    else { 
      (process.env.NODE_ENV !== 'production') && warnInvalidSource(s) 
    } 
  }) 
} 
else if (isRef(source)) { 
  getter = () => source.value 
} 
else if (isReactive(source)) { 
  getter = () => source 
  deep = true 
} 
else if (isFunction(source)) { 
  if (cb) { 
    // getter with cb 
    getter = () => callWithErrorHandling(source, instance, 2 /* WATCH_GETTER */) 
  } 
  else { 
    // watchEffect 的逻辑 
  } 
} 
else { 
  getter = NOOP 
  (process.env.NODE_ENV !== 'production') && warnInvalidSource(source) 
} 
if (cb && deep) { 
  const baseGetter = getter 
  getter = () => traverse(baseGetter()) 
}     

let cleanup 
// 注册无效回调函数 
const onInvalidate = (fn) => { 
  cleanup = runner.options.onStop = () => { 
    callWithErrorHandling(fn, instance, 4 /* WATCH_CLEANUP */) 
  } 
} 
// 旧值初始值 
let oldValue = isArray(source) ? [] : INITIAL_WATCHER_VALUE /*{}*/ 
// 回调函数 
const applyCb = cb 
  ? () => { 
    // 组件销毁，则直接返回 
    if (instance && instance.isUnmounted) { 
      return 
    } 
    // 求得新值 
    const newValue = runner() 
    if (deep || hasChanged(newValue, oldValue)) { 
      // 执行清理函数 
      if (cleanup) { 
        cleanup() 
      } 
      callWithAsyncErrorHandling(cb, instance, 3 /* WATCH_CALLBACK */, [ 
        newValue, 
        // 第一次更改时传递旧值为 undefined 
        oldValue === INITIAL_WATCHER_VALUE ? undefined : oldValue, 
        onInvalidate 
      ]) 
      // 更新旧值 
      oldValue = newValue 
    } 
  } 
  : void 0 


const invoke = (fn) => fn() 
let scheduler 
if (flush === 'sync') { 
  // 同步 
  scheduler = invoke 
} 
else if (flush === 'pre') { 
  scheduler = job => { 
    if (!instance || instance.isMounted) { 
      // 进入异步队列，组件更新前执行 
      queueJob(job) 
    } 
    else { 
      // 如果组件还没挂载，则同步执行确保在组件挂载前 
      job() 
    } 
  } 
} 
else { 
  // 进入异步队列，组件更新后执行 
  scheduler = job => queuePostRenderEffect(job, instance && instance.suspense) 
} 

const runner = effect(getter, { 
  // 延时执行 
  lazy: true, 
  // computed effect 可以优先于普通的 effect 先运行，比如组件渲染的 effect 
  computed: true, 
  onTrack, 
  onTrigger, 
  scheduler: applyCb ? () => scheduler(applyCb) : scheduler 
}) 
// 在组件实例中记录这个 effect 
recordInstanceBoundEffect(runner) 
// 初次执行 
if (applyCb) { 
  if (immediate) { 
    applyCb() 
  } 
  else { 
    // 求旧值 
    oldValue = runner() 
  } 
} 
else { 
  // 没有 cb 的情况 
  runner() 
} 

return () => { 
  stop(runner) 
  if (instance) { 
    // 移除组件 effects 对这个 runner 的引用 
    remove(instance.effects, runner) 
  } 
} 
function stop(effect) { 
  if (effect.active) { 
    cleanup(effect) 
    if (effect.options.onStop) { 
      effect.options.onStop() 
    } 
    effect.active = false 
  } 
} 
