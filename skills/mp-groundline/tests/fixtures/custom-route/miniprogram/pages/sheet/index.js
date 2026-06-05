// Skyline custom route — NO WebView equivalent → rewrite.
const customRoute = {
  routeBuilder() {
    'worklet';
    return { duration: 300 };
  }
};
Page({
  openSheet() {
    wx.router.addRouteBuilder('mySheet', customRoute.routeBuilder);
    wx.navigateTo({ url: 'wx://bottom-sheet/pages/sheet/index' });
  }
});
