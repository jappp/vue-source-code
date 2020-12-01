function createGetter(isReadonly = false, shallow = false) {
  return function get(target, key, receiver) {
    if (key === "__v_isReactive" /* IS_REACTIVE */) {
      return !isReadonly;
    }
    else if (key === "__v_isReadonly" /* IS_READONLY */) {
      return isReadonly;
    }
    else if (key === "__v_raw" /* RAW */ &&
      receiver ===
      (isReadonly
        ? target["__v_readonly" /* READONLY */]
        : target["__v_reactive" /* REACTIVE */])) {
      return target;
    }
    const targetIsArray = isArray(target);
    if (targetIsArray && hasOwn(arrayInstrumentations, key)) {
      return Reflect.get(arrayInstrumentations, key, receiver);
    }
    const res = Reflect.get(target, key, receiver);
    if (isSymbol(key)
      ? builtInSymbols.has(key)
      : key === `__proto__` || key === `__v_isRef`) {
      return res;
    }
    if (!isReadonly) {
      track(target, "get" /* GET */, key);
    }
    if (shallow) {
      return res;
    }
    if (isRef(res)) {
      return targetIsArray ? res : res.value;
    }
    if (isObject(res)) {
      return isReadonly ? readonly(res) : reactive(res);
    }
    return res;
  };
}
