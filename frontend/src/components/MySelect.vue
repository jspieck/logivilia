<template>
  <div :class="clicked ? 'selectBox clicked' : 'selectBox'" :disabled="isDisabled">
    <select class="fpfSelect"
      v-model="selectedOption"
      :disabled="isDisabled"
      @click="clicked = !clicked">
      <option v-for="[i, option] in options.entries()" :value="option" :key="`sel${i}`">
        {{ option }}
      </option>
    </select>
    <ion-icon class="select-icon" name="caret-down-outline"></ion-icon>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  modelValue: [String, Number], // Allow both String and Number
  options: Array,
  isDisabled: Boolean
})

const emit = defineEmits(['update:modelValue'])

const selectedOption = ref(props.modelValue)
const clicked = ref(false)

// Watch for parent changes
watch(() => props.modelValue, (newValue) => {
  selectedOption.value = newValue
})

// Watch for local changes
watch(selectedOption, (newValue) => {
  emit('update:modelValue', newValue)
})
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
  top: 9px;
  transition: .3s all;
  transform: rotate(0deg);
  pointer-events: none;
}

.selectBox{
  position: relative;
  border-radius: 6px;
  background-color: #fff;
  border: none;
  display: inline-block;

  &.clicked .select-icon {
    transform: rotate(180deg);
  }
}

</style>
