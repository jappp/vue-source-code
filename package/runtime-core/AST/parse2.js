function parseElement(context, ancestors) {

  // 是否在 pre 标签内

  const wasInPre = context.inPre

  // 是否在 v-pre 指令内

  const wasInVPre = context.inVPre

  // 获取当前元素的父标签节点

  const parent = last(ancestors)

  // 解析开始标签，生成一个标签节点，并前进代码到开始标签后

  const element = parseTag(context, 0 /* Start */, parent)

  // 是否在 pre 标签的边界

  const isPreBoundary = context.inPre && !wasInPre

  // 是否在 v-pre 指令的边界

  const isVPreBoundary = context.inVPre && !wasInVPre

  if (element.isSelfClosing || context.options.isVoidTag(element.tag)) {

    // 如果是自闭和标签，直接返回标签节点

    return element

  }

  // 下面是处理子节点的逻辑

  // 先把标签节点添加到 ancestors，入栈

  ancestors.push(element)

  const mode = context.options.getTextMode(element, parent)

  // 递归解析子节点，传入 ancestors

  const children = parseChildren(context, mode, ancestors)

  // ancestors 出栈

  ancestors.pop()

  // 添加到 children 属性中

  element.children = children

  // 结束标签

  if (startsWithEndTagOpen(context.source, element.tag)) {

    // 解析结束标签，并前进代码到结束标签后

    parseTag(context, 1 /* End */, parent)

  }

  else {

    emitError(context, 24 /* X_MISSING_END_TAG */, 0, element.loc.start);

    if (context.source.length === 0 && element.tag.toLowerCase() === 'script') {

      const first = children[0];

      if (first && startsWith(first.loc.source, '<!--')) {

        emitError(context, 8 /* EOF_IN_SCRIPT_HTML_COMMENT_LIKE_TEXT */)

      }

    }

  }

  // 更新标签节点的代码位置，结束位置到结束标签后

  element.loc = getSelection(context, element.loc.start)

  if (isPreBoundary) {

    context.inPre = false

  }

  if (isVPreBoundary) {

    context.inVPre = false

  }

  return element

}

function parseTag(context, type, parent) {

  // 标签打开

  const start = getCursor(context)

  // 匹配标签文本结束的位置

  const match = /^<\/?([a-z][^\t\r\n\f />]*)/i.exec(context.source);

  const tag = match[1];

  const ns = context.options.getNamespace(tag, parent);

  // 前进代码到标签文本结束位置

  advanceBy(context, match[0].length);

  // 前进代码到标签文本后面的空白字符后

  advanceSpaces(context);

  // 保存当前状态以防我们需要用 v-pre 重新解析属性

  const cursor = getCursor(context);

  const currentSource = context.source;

  // 解析标签中的属性，并前进代码到属性后

  let props = parseAttributes(context, type);

  // 检查是不是一个 pre 标签

  if (context.options.isPreTag(tag)) {

    context.inPre = true;

  }

  // 检查属性中有没有 v-pre 指令

  if (!context.inVPre &&

    props.some(p => p.type === 7 /* DIRECTIVE */ && p.name === 'pre')) {

    context.inVPre = true;

    // 重置 context

    extend(context, cursor);

    context.source = currentSource;

    // 重新解析属性，并把 v-pre 过滤了

    props = parseAttributes(context, type).filter(p => p.name !== 'v-pre');

  }

  // 标签闭合

  let isSelfClosing = false;

  if (context.source.length === 0) {

    emitError(context, 9 /* EOF_IN_TAG */);

  }

  else {

    // 判断是否自闭合标签

    isSelfClosing = startsWith(context.source, '/>');

    if (type === 1 /* End */ && isSelfClosing) {

      // 结束标签不应该是自闭和标签

      emitError(context, 4 /* END_TAG_WITH_TRAILING_SOLIDUS */);

    }

    // 前进代码到闭合标签后

    advanceBy(context, isSelfClosing ? 2 : 1);

  }

  let tagType = 0 /* ELEMENT */;

  const options = context.options;

  // 接下来判断标签类型，是组件、插槽还是模板

  if (!context.inVPre && !options.isCustomElement(tag)) {

    // 判断是否有 is 属性

    const hasVIs = props.some(p => p.type === 7 /* DIRECTIVE */ && p.name === 'is');

    if (options.isNativeTag && !hasVIs) {

      if (!options.isNativeTag(tag))

        tagType = 1 /* COMPONENT */;

    }

    else if (hasVIs ||

      isCoreComponent(tag) ||

      (options.isBuiltInComponent && options.isBuiltInComponent(tag)) ||

      /^[A-Z]/.test(tag) ||

      tag === 'component') {

      tagType = 1 /* COMPONENT */;

    }

    if (tag === 'slot') {

      tagType = 2 /* SLOT */;

    }

    else if (tag === 'template' &&

      props.some(p => {

        return (p.type === 7 /* DIRECTIVE */ && isSpecialTemplateDirective(p.name));

      })) {

      tagType = 3 /* TEMPLATE */;

    }

  }

  return {

    type: 1 /* ELEMENT */,

    ns,

    tag,

    tagType,

    props,

    isSelfClosing,

    children: [],

    loc: getSelection(context, start),

    codegenNode: undefined

  };

}

function parseChildren(context, mode, ancestors) {

  const parent = last(ancestors)

  const ns = parent ? parent.ns : 0 /* HTML */

  const nodes = []

  // 自顶向下分析代码，生成 nodes

  let removedWhitespace = false

  if (mode !== 2 /* RAWTEXT */) {

    if (!context.inPre) {

      for (let i = 0; i < nodes.length; i++) {

        const node = nodes[i]

        if (node.type === 2 /* TEXT */) {

          if (!/[^\t\r\n\f ]/.test(node.content)) {

            // 匹配空白字符

            const prev = nodes[i - 1]

            const next = nodes[i + 1] 

            // 如果空白字符是开头或者结尾节点

            // 或者空白字符与注释节点相连

            // 或者空白字符在两个元素之间并包含换行符

            // 那么这些空白字符节点都应该被移除

            if (!prev ||

              !next ||

              prev.type === 3 /* COMMENT */ ||

              next.type === 3 /* COMMENT */ ||

              (prev.type === 1 /* ELEMENT */ &&

                next.type === 1 /* ELEMENT */ &&

                /[\r\n]/.test(node.content))) {

              removedWhitespace = true

              nodes[i] = null

            }

            else {

              // 否则压缩这些空白字符到一个空格

              node.content = ' '

            }

          }

          else {

            // 替换内容中的空白空间到一个空格

            node.content = node.content.replace(/[\t\r\n\f ]+/g, ' ')

          }

        }

        else if (!(process.env.NODE_ENV !== 'production') && node.type === 3 /* COMMENT */) {

          // 生产环境移除注释节点

          removedWhitespace = true

          nodes[i] = null

        }

      }

    }

    else if (parent && context.options.isPreTag(parent.tag)) {

      // 根据 HTML 规范删除前导换行符

      const first = nodes[0]

      if (first && first.type === 2 /* TEXT */) {

        first.content = first.content.replace(/^\r?\n/, '')

      }

    }

  }

  // 过滤空白字符节点

  return removedWhitespace ? nodes.filter(Boolean) : nodes

}

function createRoot(children, loc = locStub) {

  return {

    type: 0 /* ROOT */,

    children,

    helpers: [],

    components: [],

    directives: [],

    hoists: [],

    imports: [],

    cached: 0,

    temps: 0,

    codegenNode: undefined,

    loc

  }

}

