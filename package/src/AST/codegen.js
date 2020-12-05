function generate(ast, options = {}) {
  // 创建代码生成上下文
  const context = createCodegenContext(ast, options);
  const { mode, push, prefixIdentifiers, indent, deindent, newline, scopeId, ssr } = context;
  const hasHelpers = ast.helpers.length > 0;
  const useWithBlock = !prefixIdentifiers && mode !== 'module';
  const genScopeId = scopeId != null && mode === 'module';
  // 生成预设代码
  if ( mode === 'module') {
    genModulePreamble(ast, context, genScopeId);
  }
  else {
    genFunctionPreamble(ast, context);
  }
  if (!ssr) {
    push(`function render(_ctx, _cache) {`);
  }
  else {
    push(`function ssrRender(_ctx, _push, _parent, _attrs) {`);
  }
  indent();
  if (useWithBlock) {
    // 处理带 with 的情况，Web 端运行时编译
    push(`with (_ctx) {`);
    indent();
    if (hasHelpers) {
      push(`const { ${ast.helpers
        .map(s => `${helperNameMap[s]}: _${helperNameMap[s]}`)
        .join(', ')} } = _Vue`);
      push(`\n`);
      newline();
    }
  }
  // 生成自定义组件声明代码
  if (ast.components.length) {
    genAssets(ast.components, 'component', context);
    if (ast.directives.length || ast.temps > 0) {
      newline();
    }
  }
  // 生成自定义指令声明代码
  if (ast.directives.length) {
    genAssets(ast.directives, 'directive', context);
    if (ast.temps > 0) {
      newline();
    }
  }
  // 生成临时变量代码
  if (ast.temps > 0) {
    push(`let `);
    for (let i = 0; i < ast.temps; i++) {
      push(`${i > 0 ? `, ` : ``}_temp${i}`);
    }
  }
  if (ast.components.length || ast.directives.length || ast.temps) {
    push(`\n`);
    newline();
  }
  if (!ssr) {
    push(`return `);
  }
  // 生成创建 VNode 树的表达式
  if (ast.codegenNode) {
    genNode(ast.codegenNode, context);
  }
  else {
    push(`null`);
  }
  if (useWithBlock) {
    deindent();
    push(`}`);
  }
  deindent();
  push(`}`);
  return {
    ast,
    code: context.code,
    map: context.map ? context.map.toJSON() : undefined
  };
}

function createCodegenContext(ast, { mode = 'function', prefixIdentifiers = mode === 'module', sourceMap = false, filename = `template.vue.html`, scopeId = null, optimizeBindings = false, runtimeGlobalName = `Vue`, runtimeModuleName = `vue`, ssr = false }) {
  const context = {
    mode,
    prefixIdentifiers,
    sourceMap,
    filename,
    scopeId,
    optimizeBindings,
    runtimeGlobalName,
    runtimeModuleName,
    ssr,
    source: ast.loc.source,
    code: ``,
    column: 1,
    line: 1,
    offset: 0,
    indentLevel: 0,
    pure: false,
    map: undefined,
    helper(key) {
      return `_${helperNameMap[key]}`
    },
    push(code) {
      context.code += code
    },
    indent() {
      newline(++context.indentLevel)
    },
    deindent(withoutNewLine = false) {
      if (withoutNewLine) {
        --context.indentLevel
      }
      else {
        newline(--context.indentLevel)
      }
    },
    newline() {
      newline(context.indentLevel)
    }
  }
  function newline(n) {
    context.push('\n' + `  `.repeat(n))
  }
  return context
}

function genModulePreamble(ast, context, genScopeId) {
  const { push, newline, optimizeBindings, runtimeModuleName } = context
  // 处理 scopeId
  if (ast.helpers.length) {
     // 生成 import 声明代码
    if (optimizeBindings) {
      push(`import { ${ast.helpers
        .map(s => helperNameMap[s])
        .join(', ')} } from ${JSON.stringify(runtimeModuleName)}\n`)
      push(`\n// Binding optimization for webpack code-split\nconst ${ast.helpers
        .map(s => `_${helperNameMap[s]} = ${helperNameMap[s]}`)
        .join(', ')}\n`)
    }
    else {
      push(`import { ${ast.helpers
        .map(s => `${helperNameMap[s]} as _${helperNameMap[s]}`)
        .join(', ')} } from ${JSON.stringify(runtimeModuleName)}\n`)
    }
  }
  // 处理 ssrHelpers
  // 处理 imports
  // 处理 scopeId
  genHoists(ast.hoists, context)
  newline()
  push(`export `)
}

function genHoists(hoists, context) {
  if (!hoists.length) {
    return
  }
  context.pure = true
  const { push, newline } = context
  newline()
  hoists.forEach((exp, i) => {
    if (exp) {
      push(`const _hoisted_${i + 1} = `)
      genNode(exp, context)
      newline()
    }
  })
  context.pure = false
}

function genAssets(assets, type, { helper, push, newline }) {
  const resolver = helper(type === 'component' ? RESOLVE_COMPONENT : RESOLVE_DIRECTIVE)
  for (let i = 0; i < assets.length; i++) {
    const id = assets[i]
    push(`const ${toValidAssetId(id, type)} = ${resolver}(${JSON.stringify(id)})`)
    if (i < assets.length - 1) {
      newline()
    }
  }
}

