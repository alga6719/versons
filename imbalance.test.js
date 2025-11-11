test('simple imbalance calc sanity', () => {
  const bids = [{q:10},{q:5}], asks = [{q:8},{q:7}];
  const bidVol = bids.reduce((s,i)=>s+i.q,0), askVol = asks.reduce((s,i)=>s+i.q,0);
  const imbalance = (bidVol - askVol)/(bidVol + askVol);
  expect(imbalance).toBeCloseTo(0.0);
});
