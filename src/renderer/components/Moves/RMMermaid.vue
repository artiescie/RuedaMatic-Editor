<template>
  <div class="container-fluid">
      <PanZoom :max-zoom="2.5" :min-zoom="1" :zoom-step="0.04">
      <VueMermaid
        :nodes="graphData"
        type="graph LR"
        @nodeClick="nodeClick"
      ></VueMermaid>
    </PanZoom>
  </div>
</template>

<script>
import VueMermaid from '../VueMermaid'
import PanZoom from '@andi23rosca/vue-pan-zoom'

export default {
  name: 'RMMermaid',
  components: { VueMermaid, PanZoom },
  props: {
    graphData: Array
  },
  methods: {
    nodeClick (id) {
      this.$emit('nodeClick', id)
    }
  }
}
</script>

<!-- Add "scoped" attribute to limit CSS to this component only -->
<style scoped>
h3 {
  margin: 40px 0 0;
}
ul {
  list-style-type: none;
  padding: 0;
}
li {
  display: inline-block;
  margin: 0 10px;
}
a {
  color: #42b983;
}
</style>
