export default {
  init(){
    this.traders = [
      { name: 'TraderA', weight: 0.9, accuracy: 0.82 },
      { name: 'TraderB', weight: 0.6, accuracy: 0.75 }
    ];
    this.coinActivity = {};
  },
  update({ symbol, traderName, action, size = 1.0 }){
    if(!this.coinActivity[symbol]) this.coinActivity[symbol]=0;
    const t = this.traders.find(x=>x.name===traderName);
    if(!t) return;
    const dir = (action==='buy')?1:-1;
    this.coinActivity[symbol] += dir * t.weight * t.accuracy * (size||1.0);
    if(this.coinActivity[symbol]>5) this.coinActivity[symbol]=5;
    if(this.coinActivity[symbol]<-5) this.coinActivity[symbol]=-5;
  },
  getInfluence(symbol){
    return this.coinActivity[symbol] || 0;
  }
};
