// Synthesised environmental sounds. No samples, microphone or remote requests.
export class EnvironmentSound {
  constructor(){this.enabled=false;this.context=null;this.stride=0;this.crackle=0;}
  async enable(){
    try {
      if(!this.context){
        const Audio=window.AudioContext||window.webkitAudioContext;
        if(!Audio)return false;
        const c=this.context=new Audio();this.master=c.createGain();this.master.gain.value=0;this.master.connect(c.destination);
        this.buffer=c.createBuffer(1,c.sampleRate*2,c.sampleRate);
        const data=this.buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
        const source=c.createBufferSource();source.buffer=this.buffer;source.loop=true;
        this.filter=c.createBiquadFilter();this.filter.type='lowpass';this.filter.frequency.value=450;
        this.wind=c.createGain();this.wind.gain.value=.08;
        source.connect(this.filter);this.filter.connect(this.wind);this.wind.connect(this.master);source.start();
      }
      await this.context.resume();this.enabled=this.context.state==='running';return this.enabled;
    } catch {return false;}
  }
  mute(){this.enabled=false;if(this.context)this.master.gain.setTargetAtTime(0,this.context.currentTime,.08);}
  pulse(volume,duration,frequency){
    const c=this.context,source=c.createBufferSource(),filter=c.createBiquadFilter(),gain=c.createGain();
    source.buffer=this.buffer;filter.type='lowpass';filter.frequency.value=frequency;
    gain.gain.setValueAtTime(volume,c.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,c.currentTime+duration);
    source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start(0,Math.random());source.stop(c.currentTime+duration);
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }
  update(dt,{active,storm,speed,fire}){
    if(!this.context)return;
    const c=this.context,t=c.currentTime,audible=this.enabled&&active;
    this.master.gain.setTargetAtTime(audible?.42:0,t,.15);
    if(!audible)return;
    this.wind.gain.setTargetAtTime((storm?.3:.08)*(1+Math.sin(t*.7)*.15),t,.3);
    this.filter.frequency.setTargetAtTime(storm?900:420,t,.3);
    this.stride+=speed*dt;if(this.stride>.85){this.stride=0;this.pulse(.22,.17,1700);}
    this.crackle+=dt;if(fire>0&&this.crackle>.15+Math.random()*.4){this.crackle=0;this.pulse(.07*fire,.06,2600);}
  }
}
