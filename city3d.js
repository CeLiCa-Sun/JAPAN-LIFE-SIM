export function drawCity(canvas,world){
 const gl=canvas.getContext('webgl',{antialias:true});if(!gl)return false;
 const vert='attribute vec3 p;attribute vec3 color;uniform float spin;varying vec3 v;void main(){float a=spin;vec3 q=vec3(p.x*cos(a)-p.z*sin(a),p.y,p.x*sin(a)+p.z*cos(a));gl_Position=vec4(q.x*.9,q.y*.8+q.z*.22,0.0,1.0);v=color;}';
 const frag='precision mediump float;varying vec3 v;void main(){gl_FragColor=vec4(v,1.0);}';
 function shader(t,s){const o=gl.createShader(t);gl.shaderSource(o,s);gl.compileShader(o);if(!gl.getShaderParameter(o,gl.COMPILE_STATUS))throw Error(gl.getShaderInfoLog(o));return o}
 const program=gl.createProgram();gl.attachShader(program,shader(gl.VERTEX_SHADER,vert));gl.attachShader(program,shader(gl.FRAGMENT_SHADER,frag));gl.linkProgram(program);if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw Error('WebGL link failed');
 const verts=[],colors=[];function tri(a,b,c,color){for(const p of [a,b,c]){verts.push(...p);colors.push(...color)}}function rect(a,b,c,d,color){tri(a,b,c,color);tri(a,c,d,color)}
 function block(x,z,height){const w=.055,h=height/95;const a=[x-w,-.48,z-w],b=[x+w,-.48,z-w],c=[x+w,-.48,z+w],d=[x-w,-.48,z+w],e=[x-w,-.48+h,z-w],f=[x+w,-.48+h,z-w],g=[x+w,-.48+h,z+w],j=[x-w,-.48+h,z+w];rect(a,b,f,e,[.26,.48,.62]);rect(b,c,g,f,[.16,.34,.49]);rect(e,f,g,j,[.47,.72,.76])}
 rect([-1,-.5,-1],[1,-.5,-1],[1,-.5,1],[-1,-.5,1],[.12,.24,.29]);
 for(const s of world.districtStructures||[]){block((s.x-50)/52,(s.y-50)/52,s.height)}
 for(const v of world.cityVehicles||[]){const node=(world.districtStructures||[]).find(p=>p.id==='B-'+v.node);if(node)block((node.x-50)/52+.09,(node.y-50)/52+.09,4)}
 gl.useProgram(program);const buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.STATIC_DRAW);const position=gl.getAttribLocation(program,'p');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,3,gl.FLOAT,false,0,0);const cb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,cb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(colors),gl.STATIC_DRAW);const color=gl.getAttribLocation(program,'color');gl.enableVertexAttribArray(color);gl.vertexAttribPointer(color,3,gl.FLOAT,false,0,0);gl.viewport(0,0,canvas.width,canvas.height);gl.clearColor(.045,.09,.13,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);gl.uniform1f(gl.getUniformLocation(program,'spin'),(world.camera?.x||0)/140);gl.drawArrays(gl.TRIANGLES,0,verts.length/3);return true;
}
