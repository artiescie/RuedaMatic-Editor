<template>
  <div id='mermaid' class='mermaid'>
    <pulse-loader color="red" style="height: 64px;display: flex;align-items: center;justify-content: center" />
  </div>
</template>

<script>
// import mermaid from 'mermaid' - not here - in promise resolution in beforeMount
/* Adapted from https://github.com/robin1liu/vue-mermaid */
export default {
  name: 'VueMermaid',
  props: {
    type: {
      type: String,
      default: 'graph TD'
    },
    nodes: {
      type: Array,
      required: true
    },
    styles: {
      type: Array,
      default () {
        return []
      }
    },
    config: {
      type: Object,
      default () {
        return { theme: 'default', startOnLoad: false, securityLevel: 'loose' }
      }
    }
  },
  watch: {
    // RMMMermaid relays this in, but doesn't itself need to watch it
    nodes: {
      handler: function (newValue) {
        this.init()
        this.loadNodes()
      },
      deep: true
    }
  },
  data: function () {
    return {
      mermaid: null, // see beforeMount
      edges: [
        { type: 'default', open: '[', close: ']' },
        { type: 'round', open: '(', close: ')' },
        { type: 'circle', open: '((', close: '))' },
        { type: 'asymetric', open: '>', close: ']' },
        { type: 'rhombus', open: '{', close: '}' }
      ]
    }
  },
  beforeMount () {
    const that = this
    import('mermaid/dist/mermaid').then(m => {
      that.mermaid = m
      that.init()
      that.loadNodes()
    })
  },
  destroyed () {
    // v-if on container may be false
    console.log('VueMermaid.vue destroyed')
  },
  computed: {
    nodeObject () {
      const { nodes } = this
      if (Array.isArray(nodes) && nodes.length > 0) {
        const arrayToObject = (arr, keyField) =>
          Object.assign({}, ...arr.map(item => ({ [item[keyField]]: item })))
        return arrayToObject(nodes, 'id')
      } else {
        return {}
      }
    },
    customStyle () {
      const { nodes, styles } = this
      const nodeStyles = nodes
        .filter(node => node.style)
        .map(node => `style ${node.id} ${node.style}`)
      return nodeStyles.concat(styles)
    },
    parseCode () {
      const { nodes } = this
      if (Array.isArray(nodes) && nodes.length > 0) {
        const parseCode = this.type + '\n'
        const groupNodes = this.getGroupNodes(nodes)
        const code = parseCode + groupNodes + this.customStyle.join(' \n')
        this.load(code)
        // console.log(code)
        return code
      } else {
        return ''
      }
    }
  },
  methods: {
    getGroupNodes (nodes) {
      const innerMap = new Map()
      nodes.forEach(element => {
        const group = element.group || ''
        const data = innerMap.get(group) || { nids: new Set(), narr: [] }
        data.nids.add(element.id)
        data.narr.push(element)
        innerMap.set(group, data)
      })
      return [...innerMap.entries()]
        .map(item => {
          const [groupName, entry] = item
          const { nids, narr } = entry
          if (groupName !== '') {
            const innerNodes = []
            const outNodes = []
            narr.forEach(node => {
              if (node.next) {
                innerNodes.push({
                  id: node.id,
                  text: node.text,
                  style: node.style
                })
                node.next.forEach(id => {
                  if (nids.has(id)) {
                    innerNodes.push({
                      id: node.id,
                      text: node.text,
                      link: node.link,
                      next: [id]
                    })
                  } else {
                    outNodes.push({
                      id: node.id,
                      text: node.text,
                      link: node.link,
                      next: [id]
                    })
                  }
                })
              } else {
                innerNodes.push(node)
              }
            })
            const innerNodesStr = this.buildNodesStr(innerNodes)
            const outNodeStr = this.buildNodesStr(outNodes)
            return `subgraph ${groupName} \n ${innerNodesStr} end \n ${outNodeStr}`
          } else {
            const nodesStr = this.buildNodesStr(narr)
            return nodesStr
          }
        })
        .join(' \n')
    },
    buildNodesStr (nodes) {
      return (
        nodes
          .map(item => {
            if (item.next && item.next.length > 0) {
              return item.next
                .map((n, i) => {
                  const next = this.nodeObject[n] || this.nodeObject[n.id]
                  if (next != null && typeof next !== 'undefined') {
                    return `${this.buildNode(item)}${this.buildLink(
                      item, i
                    )}${this.buildNode(next)}`
                  } else {
                    // TODO error
                    return `${this.buildNode(item)}`
                  }
                })
                .join('\n')
            } else {
              return `${this.buildNode(item)}`
            }
          })
          .join('\n') + '\n' + nodes
          .filter(item => item.editable)
          .map(item => {
            return `click ${item.id} mermaidClick`
          })
          .join('\n') +
        '\n'
      )
    },
    buildNode (item) {
      // do something to wrap long move names https://stackoverflow.com/questions/14484787/wrap-text-in-javascript
      const wrap = (s, w) => s.replace(
        new RegExp(`(?![^\\n]{1,${w}}$)([^\\n]{1,${w}})\\s`, 'g'), '$1<br>'
      )
      const wrapText = wrap(item.text, 11)

      const edge = !item.edgeType
        ? this.edges.find(e => {
          return e.type === 'default'
        })
        : this.edges.find(e => {
          return e.type === item.edgeType
        })
      return `${item.id}${edge.open}${wrapText}${edge.close}`
    },
    buildLink (item, i) {
      return item.link && item.link[i] ? item.link[i] : '-->'
    },
    loadNodes () {
      this.load(this.parseCode)
    },
    init () {
      const that = this
      window.mermaidClick = function (id) {
        that.edit(id)
      }
      this.mermaid.initialize(this.config)
    },
    load (code) {
      if (code) {
        var container = document.getElementById('mermaid')
        if (container) {
          container.removeAttribute('data-processed')
          container.replaceChild(
            document.createTextNode(code),
            container.firstChild
          )
          // might be due to rerender without a beforeMount  // v-if on container may be false
          if (this.mermaid) this.mermaid.init(code, container)
        }
      }
    },
    edit (id) {
      this.$emit('nodeClick', id)
    }
  }
}
</script>

<style>
/* svg {width: 100%; height: auto; } */
</style>
