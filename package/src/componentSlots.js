const initSlots = (instance, children) => {
  if (instance.vnode.shapeFlag & 32 /* SLOTS_CHILDREN */) {
    const type = children._
    if (type) {
      instance.slots = children
      def(children, '_', type)
    }
    else {
      normalizeObjectSlots(children, (instance.slots = {}))
    }
  }
  else {
    instance.slots = {}
    if (children) {
      normalizeVNodeSlots(instance, children)
    }
  }
  def(instance.slots, InternalObjectKey, 1)
}

