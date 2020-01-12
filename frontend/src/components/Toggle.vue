<template>
  <div>
    <input type="checkbox" id="cbx" @click="toggle" style="display:none"/>
    <label for="cbx" class="toggle">
      <span>
        <svg width="10px" height="10px" viewBox="0 0 10 10">
          <path d="M5,1 L5,1 C2.790861,1 1,2.790861 1,5 L1,5 C1,7.209139
          2.790861,9 5,9 L5,9 C7.209139,9 9,7.209139 9,5 L9,5 C9,2.790861
          7.209139,1 5,1 L5,9 L5,1 Z"></path>
        </svg>
      </span>
    </label>
  </div>
</template>

<script>
export default {
  name: 'Toggle',
  model: {
    prop: 'isEnabled',
    event: 'toggle',
  },
  data() {
    return {
      isEnabled: true,
    };
  },
  methods: {
    toggle() {
      this.isEnabled = !this.isEnabled;
      this.$emit('toggle', this.isEnabled);
    },
  },
};
</script>

<style>
.toggle {
  position: relative;
  display: block;
  width: 42px;
  height: 24px;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transform: translate3d(0, 0, 0);
}

.toggle:before {
  content: "";
  position: relative;
  top: 1px;
  left: 1px;
  width: 40px;
  height: 22px;
  display: block;
  background: #c8ccd4;
  border-radius: 12px;
  transition: background 0.2s ease;
}

.toggle span {
  position: absolute;
  top: 0;
  left: 0;
  width: 24px;
  height: 24px;
  display: block;
  background: #fff;
  border-radius: 50%;
  box-shadow: 0 2px 6px rgba(154,153,153,0.75);
  transition: all 0.2s ease;
}

.toggle span svg {
  margin: 7px;
  fill: none;
}

.toggle span svg path {
  stroke: #c8ccd4;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 24;
  stroke-dashoffset: 0;
  transition: all 0.5s linear;
}

#cbx:checked + .toggle:before {
  background: #52d66b;
}

#cbx:checked + .toggle span {
  transform: translateX(18px);
}

#cbx:checked + .toggle span path {
  stroke: #52d66b;
  stroke-dasharray: 25;
  stroke-dashoffset: 25;
}
</style>
