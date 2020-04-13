<template>
  <div :class="clicked ? 'selectBox clicked' : 'selectBox'" :disabled="isDisabled">
    <select class="fpfSelect" v-model="selectedOption" :disabled="isDisabled"
      @click="clicked = !clicked"
      @input="event => {$emit('input', event.target.value)}">
      <option v-for="option in options" :value="option"
        v-bind:key="option">{{option}}</option>
    </select>
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
  watch: {
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
  text-align: center;
}

.selectBox{
  position: relative;
  border-radius: 6px;
  background-color: #fff;
  border: none;
  display: inline-block;

  &:after {
    content: "\f3d0";
    font-family: IonIcons;
    font-size: 1.2em;
    position:absolute;
    right: 10px;
    top: 12px;
    transition: .3s all;
    transform: rotate(0deg);
    pointer-events: none;
  }
  &.clicked:after {
    transform: rotate(180deg);
  }
  &[disabled=disabled]:after{
    content: "";
  }
}
</style>
