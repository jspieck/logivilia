<template>
  <div :class="clicked ? 'selectBox clicked' : 'selectBox'" :disabled="isDisabled">
    <select class="fpfSelect" v-model="selectedOption" :disabled="isDisabled"
      @click="clicked = !clicked"
      @input="event => {$emit('input', event.target.value)}">
      <option v-for="[i, option] in options.entries()" :value="option"
        v-bind:key="`sel${_uid}${i}`">{{option}}</option>
    </select>
    <ion-icon name="chevron-forward" class="select-icon"/>
  </div>
</template>

<script>
export default {
  name: 'Select',
  props: ['num', 'sel', 'options', 'isDisabled'],
  created() {
    this.selectedOption = this.sel;
  },
  data() {
    return {
      selectedOption: '',
      clicked: false
    };
  },
  computed: {
    selection() {
      return this.sel;
    }
  },
  watch: {
    selection() {
      this.selectedOption = this.sel;
    },
    value: {
      immediate: true,
      handler(newValue) {
        this.selectedOption = newValue;
      },
    },
  },
};
</script>

<style scoped lang="scss">
select{
  -webkit-appearance: none;
  border: none;
  font-size: 13px;
  list-style: none;
  outline: none;
  overflow: hidden;
  text-align: left;
  text-decoration: none;
  vertical-align: middle;
  background-color: transparent;
  color: #202124!important;
  height: 36px;
  padding-left: 8px;
  padding-right: 30px;
  background-image: none;
  min-width: 70px;
  background: #eeeeee;
  text-align: center;
}

.select-icon {
  font-size: 1.2em;
  position: absolute;
  right: 10px;
  top: 12px;
  transition: .3s all;
  transform: rotate(90deg);
  pointer-events: none;
}

.selectBox{
  position: relative;
  border-radius: 6px;
  background-color: #fff;
  border: none;
  display: inline-block;

  &.clicked .select-icon {
    transform: rotate(270deg);
  }
}
</style>
