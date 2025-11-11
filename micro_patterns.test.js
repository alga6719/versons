test('micro pattern basic sanity', () => {
  const candles = [
    {open:1,close:2,volume:10},
    {open:2,close:3,volume:12},
    {open:3,close:4,volume:15}
  ];
  expect(candles.length).toBeGreaterThan(0);
});
