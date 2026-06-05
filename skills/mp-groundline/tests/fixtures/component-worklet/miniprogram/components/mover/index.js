Component({
  methods: {
    onPan(e) {
      'worklet';
      this.applyAnimatedStyle('.handle', () => {
        'worklet';
        return { transform: `translateX(${e.detail.dx}px)` };
      });
    }
  }
});
