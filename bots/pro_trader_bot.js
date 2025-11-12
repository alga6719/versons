import ProTraderModule from './pro_trader_module.js';

export default {
  init(context){
    this.balance = 10000;
    this.positions = {};
    this.streak = 0;
  },
  onSignal(signal){
    const { composite, price, symbol } = signal;
    const traderInfluence = ProTraderModule.getInfluence(symbol) || 0;
    const adaptiveWeight = 1.0;
    const compositeAdjusted = composite * adaptiveWeight + traderInfluence * 100;
    let decision = { action:'hold', size:0, recommendation:null };

    if(compositeAdjusted >= 65){
      decision.action='buy';
      decision.size = Math.min(0.5, 0.1 + (compositeAdjusted - 65) / 70);
      decision.recommendation = { action:'buy', confidence: Number(compositeAdjusted.toFixed(1)), suggestedPrice: Number((price*0.998).toFixed(2)), suggestedTimeMinutes:3, rationale:'High composite + pro trader influence' };
    } else if (compositeAdjusted <= -65){
      decision.action='sell';
      decision.size = Math.min(0.5, 0.1 + (Math.abs(compositeAdjusted) - 65) / 70);
      decision.recommendation = { action:'sell', confidence: Number(Math.abs(compositeAdjusted).toFixed(1)), suggestedPrice: Number((price*1.002).toFixed(2)), suggestedTimeMinutes:3, rationale:'Strong negative composite + trader influence' };
    } else {
      decision.recommendation = { action:'watch', confidence: Number(compositeAdjusted.toFixed(1)), suggestedPrice: Number(price.toFixed(2)), suggestedTimeMinutes:5, rationale:'Below execution threshold; monitor for confirmation' };
    }
    return decision;
  }
};
