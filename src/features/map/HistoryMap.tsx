import {useEffect,useRef,useState} from 'react';import type {Map as MapInstance,Marker,GeoJSONSource} from 'maplibre-gl';
import type {Scene} from '../../domain/types';import type {Selection} from '../../state/controller';import {mapStyle} from './style';import {buildTerritoryLayers} from './layers';import {nameAt,classifyAt} from '../../domain/time';
import 'maplibre-gl/dist/maplibre-gl.css';
export interface MapProps{scene:Scene|null;pending:{requestId:number;scene:Scene}|null;onRendered:(id:number)=>void;onSelect:(value:Selection)=>void;onUnavailable:(reason:string)=>void;selected?:Selection|null}
const empty={type:'FeatureCollection' as const,features:[]};
export function HistoryMap(props:MapProps){
 const host=useRef<HTMLDivElement>(null),mapRef=useRef<MapInstance|null>(null),latest=useRef(props);latest.current=props;
 const markers=useRef<Marker[]>([]);const [ready,setReady]=useState(false),[error,setError]=useState(''),[basemapError,setBasemapError]=useState(false);
 useEffect(()=>{let cancelled=false;let observer:ResizeObserver|undefined;
 const fail=(reason:string)=>{if(cancelled)return;setError(reason);latest.current.onUnavailable(reason)};
 if(typeof window.WebGLRenderingContext==='undefined'){fail('当前环境不支持 WebGL');return}
 import('maplibre-gl').then((lib)=>{if(cancelled||!host.current)return;try{
 const map=new lib.Map({container:host.current,style:mapStyle,center:[108,35],zoom:3.35,minZoom:1.6,maxZoom:8,attributionControl:{compact:true}});mapRef.current=map;map.addControl(new lib.NavigationControl({showCompass:false}),'top-right');map.addControl(new lib.ScaleControl({unit:'metric'}),'bottom-left');
 map.on('error',e=>{if('sourceId' in e&&(e.sourceId==='land'||e.sourceId==='rivers'))setBasemapError(true)});
 map.on('load',()=>{if(cancelled)return;map.addSource('territories',{type:'geojson',data:empty});map.addLayer({id:'territory-fill',source:'territories',type:'fill',paint:{'fill-color':['get','displayColor'],'fill-opacity':0.3}});map.addLayer({id:'territory-border',source:'territories',type:'line',filter:['==',['get','approximate'],false],paint:{'line-color':['get','displayColor'],'line-width':1.5}});map.addLayer({id:'territory-uncertain',source:'territories',type:'line',filter:['==',['get','approximate'],true],paint:{'line-color':['get','displayColor'],'line-width':1.5,'line-dasharray':[3,2]}});map.on('click','territory-fill',e=>{const id=e.features?.[0]?.properties?.entityId;if(id)latest.current.onSelect({kind:'entity',id})});map.on('mouseenter','territory-fill',()=>{map.getCanvas().style.cursor='pointer'});map.on('mouseleave','territory-fill',()=>{map.getCanvas().style.cursor=''});setReady(true)});
 observer=new ResizeObserver(()=>map.resize());observer.observe(host.current);
 }catch(e){fail(e instanceof Error?e.message:'无法创建地图')}}).catch(e=>fail(String(e)));
 return ()=>{cancelled=true;observer?.disconnect();markers.current.forEach(m=>m.remove());mapRef.current?.remove();mapRef.current=null};
 },[]);
 useEffect(()=>{const map=mapRef.current;const scene=props.pending?.scene??props.scene;if(!ready||!map||!scene||error)return;let stopped=false;let timer:ReturnType<typeof setTimeout>|undefined;
 (map.getSource('territories') as GeoJSONSource).setData(buildTerritoryLayers(scene));
 const applyMarkers=async()=>{const lib=await import('maplibre-gl');if(stopped)return;markers.current.forEach(m=>m.remove());markers.current=[];
 for(const entity of scene.catalog.entities.filter(e=>classifyAt(e.existence,scene.referenceAt)!=='outside')){
  const capital=entity.capitals.find(p=>classifyAt(p.validity,scene.referenceAt)!=='outside');const place=scene.catalog.places.find(p=>p.id===capital?.placeId);const location=place?.locations.find(l=>l.geometry.type==='Point'&&classifyAt(l.validity,scene.referenceAt)!=='outside');
  if(location?.geometry.type==='Point'){const el=document.createElement('button');el.className='capital-label';el.textContent=`◇ ${nameAt(place!.names,scene.query.year)}`;el.title=`${nameAt(entity.names,scene.query.year)}都城（近似位置）`;el.onclick=()=>latest.current.onSelect({kind:'entity',id:entity.id});markers.current.push(new lib.Marker({element:el}).setLngLat(location.geometry.coordinates as [number,number]).addTo(map))}
 }
 if(props.pending){const id=props.pending.requestId;const ack=()=>{if(!stopped)latest.current.onRendered(id)};map.once('idle',ack);map.triggerRepaint();timer=setTimeout(()=>{if(!stopped){setError('地图更新超时');latest.current.onUnavailable('地图更新超时，文字浏览仍可使用')}},12000)}
 };
 void applyMarkers();return ()=>{stopped=true;if(timer)clearTimeout(timer)};
 },[ready,error,props.pending,props.scene]);
 return <div className="map-surface"><div ref={host} className="map-canvas" aria-label="历史地图"/>{error&&<div className="map-fallback" role="status"><span className="fallback-symbol">山</span><h2>地图暂不可用</h2><p>{error}</p><p>仍可选择年份，阅读政权、事件和资料来源。</p></div>}{props.pending&&!error&&<div className="map-loading">正在切换到 {props.pending.scene.query.year} 年…</div>}{basemapError&&!error&&<p className="map-resource-warning">自然地理底图加载失败；历史条目仍可查阅。</p>}<div className="map-compass" aria-hidden="true"><span>北</span><i/></div><button className="map-reset" onClick={()=>mapRef.current?.easeTo({center:[108,35],zoom:3.35,duration:matchMedia('(prefers-reduced-motion: reduce)').matches?0:500})}>回到全图</button></div>
}
