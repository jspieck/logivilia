<template>
  <div>
    <label :class="enabled ? ['toggle', 'checked'] : 'toggle'">
      <span>
        <svg width="10px" height="10px" viewBox="0 0 10 10">
          <path d="M5,1 L5,1 C2.790861,1 1,2.790861 1,5 L1,5 C1,7.209139
          2.790861,9 5,9 L5,9 C7.209139,9 9,7.209139 9,5 L9,5 C9,2.790861
          7.209139,1 5,1 L5,9 L5,1 Z"></path>
        </svg>
      </span>
      <input 
        class="checkInput" 
        type="checkbox" 
        @change="toggle" 
        :checked="modelValue"
      />
    </label>
  </div>
</template>

<script>
import { ref, watch } from 'vue'

export default {
  name: 'ToggleComponent',
  props: {
    modelValue: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:modelValue'],
  setup(props, { emit }) {
    const enabled = ref(props.modelValue)

    watch(() => props.modelValue, (newValue) => {
      enabled.value = newValue
    })

    const toggle = (e) => {
      enabled.value = e.target.checked
      emit('update:modelValue', e.target.checked)
    }

    return {
      enabled,
      toggle
    }
  }
}
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
