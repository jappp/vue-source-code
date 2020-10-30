function reactive (target) {
  // 如果尝试把一个 readonly proxy 变成响应式，直接返回这个 readonly proxy
 if (target && target.__v_isReadonly) {
    return target
 } 
 return createReactiveObject(target, false, mutableHandlers, mutableCollectionHandlers)
}
function createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers) {
 if (!isObject(target)) {
   // 目标必须是对象或数组类型
   if ((process.env.NODE_ENV !== 'production')) {
     console.warn(`value cannot be made reactive: ${String(target)}`)
   }
   return target
 }
 if (target.__v_raw && !(isReadonly && target.__v_isReactive)) {
   // target 已经是 Proxy 对象，直接返回
   // 有个例外，如果是 readonly 作用于一个响应式对象，则继续
   return target
 }
 if (hasOwn(target, isReadonly ? "__v_readonly" /* readonly */ : "__v_reactive" /* reactive */)) {
   // target 已经有对应的 Proxy 了
   return isReadonly ? target.__v_readonly : target.__v_reactive
 }
 // 只有在白名单里的数据类型才能变成响应式
 if (!canObserve(target)) {
   return target
 }
 // 利用 Proxy 创建响应式
 const observed = new Proxy(target, collectionTypes.has(target.constructor) ? collectionHandlers : baseHandlers)
 // 给原始数据打个标识，说明它已经变成响应式，并且有对应的 Proxy 了
 def(target, isReadonly ? "__v_readonly" /* readonly */ : "__v_reactive" /* reactive */, observed)
 return observed
}

const canObserve = (value) => {
  return (!value.__v_skip &&
   isObservableType(toRawType(value)) &&
   !Object.isFrozen(value))
}
const isObservableType = /*#__PURE__*/ makeMap('Object,Array,Map,Set,WeakMap,WeakSet')

function createGetter(isReadonly = false) {
  return function get(target, key, receiver) {
    if (key === "__v_isReactive" /* isReactive */) {
      // 代理 observed.__v_isReactive
      return !isReadonly
    }
    else if (key === "__v_isReadonly" /* isReadonly */) {
      // 代理 observed.__v_isReadonly
      return isReadonly;
    }
    else if (key === "__v_raw" /* raw */) {
      // 代理 observed.__v_raw
      return target
    }
    const targetIsArray = isArray(target)
    // arrayInstrumentations 包含对数组一些方法修改的函数
    if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
      return Reflect.get(arrayInstrumentations, key, receiver)
    }
    // 求值
    const res = Reflect.get(target, key, receiver)
    // 内置 Symbol key 不需要依赖收集
    if (isSymbol(key) && builtInSymbols.has(key) || key === '__proto__') {
      return res
    }
    // 依赖收集
    !isReadonly && track(target, "get" /* GET */, key)
    return isObject(res)
      ? isReadonly
        ?
        readonly(res)
        // 如果 res 是个对象或者数组类型，则递归执行 reactive 函数把 res 变成响应式
        : reactive(res)
      : res
  }
}

const arrayInstrumentations = {}
['includes', 'indexOf', 'lastIndexOf'].forEach(key => {
  arrayInstrumentations[key] = function (...args) {
    // toRaw 可以把响应式对象转成原始数据
    const arr = toRaw(this)
    for (let i = 0, l = this.length; i < l; i++) {
      // 依赖收集
      track(arr, "get" /* GET */, i + '')
    }
    // 先尝试用参数本身，可能是响应式数据
    const res = arr[key](...args)
    if (res === -1 || res === false) {
      // 如果失败，再尝试把参数转成原始数据
      return arr[key](...args.map(toRaw))
    }
    else {
      return res
    }
  }
})

// 是否应该收集依赖
let shouldTrack = true
// 当前激活的 effect
let activeEffect
// 原始数据对象 map
const targetMap = new WeakMap()
function track(target, type, key) {
  if (!shouldTrack || activeEffect === undefined) {
    return
  }
  let depsMap = targetMap.get(target)
  if (!depsMap) {
    // 每个 target 对应一个 depsMap
    targetMap.set(target, (depsMap = new Map()))
  }
  let dep = depsMap.get(key)
  if (!dep) {
    // 每个 key 对应一个 dep 集合
    depsMap.set(key, (dep = new Set()))
  }
  if (!dep.has(activeEffect)) {
    // 收集当前激活的 effect 作为依赖
    dep.add(activeEffect)
   // 当前激活的 effect 收集 dep 集合作为依赖
    activeEffect.deps.push(dep)
  }
}