// 执行 setupComponent 函数的时候，会初始化 Prop
function setupComponent (instance, isSSR = false) {
  const { props, children, shapeFlag } = instance.vnode
  // 判断是否是一个有状态的组件
  const isStateful = shapeFlag & 4
  // 初始化 props
  initProps(instance, props, isStateful, isSSR)
  // 初始化插槽
  initSlots(instance, children)
  // 设置有状态的组件实例
  const setupResult = isStateful
    ? setupStatefulComponent(instance, isSSR)
    : undefined
  return setupResult
}

//  Props 初始化，是通过 initProps 方法来完成
function initProps(instance, rawProps, isStateful, isSSR = false) {
  const props = {}
  const attrs = {}
  def(attrs, InternalObjectKey, 1)
  // 设置 props 的值
  setFullProps(instance, rawProps, props, attrs)
  // 验证 props 合法
  if ((process.env.NODE_ENV !== 'production')) {
    validateProps(props, instance.type)
  }
  if (isStateful) {
    // 有状态组件，响应式处理
    instance.props = isSSR ? props : shallowReactive(props)
  }
  else {
    // 函数式组件处理
    if (!instance.type.props) {
      instance.props = attrs
    }
    else {
      instance.props = props
    }
  }
  // 普通属性赋值
  instance.attrs = attrs
}

function setFullProps(instance, rawProps, props, attrs) {
  // 标准化 props 的配置
  const [options, needCastKeys] = normalizePropsOptions(instance.type)
  if (rawProps) {
    for (const key in rawProps) {
      const value = rawProps[key]
      // 一些保留的 prop 比如 ref、key 是不会传递的
      if (isReservedProp(key)) {
        continue
      }
      // 连字符形式的 props 也转成驼峰形式
      let camelKey
      if (options && hasOwn(options, (camelKey = camelize(key)))) {
        props[camelKey] = value
      }
      else if (!isEmitListener(instance.type, key)) {
        // 非事件派发相关的，且不在 props 中定义的普通属性用 attrs 保留
        attrs[key] = value
      }
    }
  }
  // 遍历 props 数据求值
  if (needCastKeys) {
    // 需要做转换的 props
    const rawCurrentProps = toRaw(props)
    for (let i = 0; i < needCastKeys.length; i++) {
      const key = needCastKeys[i]
      props[key] = resolvePropValue(options, rawCurrentProps, key, rawCurrentProps[key])
    }
  }
}

function resolvePropValue(options, props, key, value) {
  const opt = options[key]
  if (opt != null) {
    const hasDefault = hasOwn(opt, 'default')
    // 默认值处理
    if (hasDefault && value === undefined) {
      const defaultValue = opt.default
      value =
        opt.type !== Function && isFunction(defaultValue)
          ? defaultValue()
          : defaultValue
    }
    // 布尔类型转换
    if (opt[0 /* shouldCast */]) {
      if (!hasOwn(props, key) && !hasDefault) {
        value = false
      }
      else if (opt[1 /* shouldCastTrue */] &&
        (value === '' || value === hyphenate(key))) {
        value = true
      }
    }
  }
  return value
}

function validateProps(props, comp) {
  const rawValues = toRaw(props)
  const options = normalizePropsOptions(comp)[0]
  for (const key in options) {
    let opt = options[key]
    if (opt == null)
      continue
    validateProp(key, rawValues[key], opt, !hasOwn(rawValues, key))
  }
}
function validateProp(name, value, prop, isAbsent) {
  const { type, required, validator } = prop
  // 检测 required
  if (required && isAbsent) {
    warn('Missing required prop: "' + name + '"')
    return
  }
  // 虽然没有值但也没有配置 required，直接返回
  if (value == null && !prop.required) {
    return
  }
  // 类型检测
  if (type != null && type !== true) {
    let isValid = false
    const types = isArray(type) ? type : [type]
    const expectedTypes = []
    // 只要指定的类型之一匹配，值就有效
    for (let i = 0; i < types.length && !isValid; i++) {
      const { valid, expectedType } = assertType(value, types[i])
      expectedTypes.push(expectedType || '')
      isValid = valid
    }
    if (!isValid) {
      warn(getInvalidTypeMessage(name, value, expectedTypes))
      return
    }
  }
  // 自定义校验器
  if (validator && !validator(value)) {
    warn('Invalid prop: custom validator check failed for prop "' + name + '".')
  }
}



function normalizePropsOptions(comp) {
  // comp.__props 用于缓存标准化的结果，有缓存，则直接返回
  if (comp.__props) {
    return comp.__props
  }
  const raw = comp.props
  const normalized = {}
  const needCastKeys = []
  // 处理 mixins 和 extends 这些 props
  let hasExtends = false
  if (!shared.isFunction(comp)) {
    const extendProps = (raw) => {
      const [props, keys] = normalizePropsOptions(raw)
      shared.extend(normalized, props)
      if (keys)
        needCastKeys.push(...keys)
    }
    if (comp.extends) {
      hasExtends = true
      extendProps(comp.extends)
    }
    if (comp.mixins) {
      hasExtends = true
      comp.mixins.forEach(extendProps)
    }
  }
  if (!raw && !hasExtends) {
    return (comp.__props = shared.EMPTY_ARR)
  }
  // 数组形式的 props 定义
  if (shared.isArray(raw)) {
    for (let i = 0; i < raw.length; i++) {
      if (!shared.isString(raw[i])) {
        warn(`props must be strings when using array syntax.`, raw[i])
      }
      const normalizedKey = shared.camelize(raw[i])
      if (validatePropName(normalizedKey)) {
        normalized[normalizedKey] = shared.EMPTY_OBJ
      }
    }
  }
  else if (raw) {
    if (!shared.isObject(raw)) {
      warn(`invalid props options`, raw)
    }
    for (const key in raw) {
      const normalizedKey = shared.camelize(key)
      if (validatePropName(normalizedKey)) {
        const opt = raw[key]
        // 标准化 prop 的定义格式
        const prop = (normalized[normalizedKey] =
          shared.isArray(opt) || shared.isFunction(opt) ? { type: opt } : opt)
        if (prop) {
          const booleanIndex = getTypeIndex(Boolean, prop.type)
          const stringIndex = getTypeIndex(String, prop.type)
          prop[0 /* shouldCast */] = booleanIndex > -1
          prop[1 /* shouldCastTrue */] =
            stringIndex < 0 || booleanIndex < stringIndex
          // 布尔类型和有默认值的 prop 都需要转换
          if (booleanIndex > -1 || shared.hasOwn(prop, 'default')) {
            needCastKeys.push(normalizedKey)
          }
        }
      }
    }
  }
  const normalizedEntry = [normalized, needCastKeys]
  comp.__props = normalizedEntry
  return normalizedEntry
}




