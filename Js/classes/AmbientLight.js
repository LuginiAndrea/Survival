export {Light};
import {EntityManager} from "./Entity.js";

class Light {
    constructor(scene, renderer, lightDimension) {
        this.scene = scene;
        this.renderer = renderer;
        this._lightDimension = lightDimension;
        
        this._dayState;

        this.initLight();
        this.initFog();
        this.initSky();
    }

    initLight() {
        this._hemiLight = new THREE.HemisphereLight( 0xffffff, 0xffffff, 0.05 );
        this._hemiLight.color.setHSL( 0.6, 1, 0.6 );
        this._hemiLight.groundColor.setHSL( 0.095, 1, 0.75 );
        this._hemiLight.position.set( 0, 500, 0 );
        this.scene.add( this._hemiLight );

        this._dirLight = new THREE.DirectionalLight( 0xffffff, 1 );
        this._dirLight.color.setHSL( 0.1, 1, 0.95 );
        this._dirLight.position.set( -1, 0.75, 1 );
        this._dirLight.position.multiplyScalar( 50 );

        this._dirLight.castShadow = true;
        this._dirLight.shadow.mapSize.width = this._dirLight.shadow.mapSize.height = 1024*2;

        this._dirLight.shadow.camera.left = -this._lightDimension;
        this._dirLight.shadow.camera.right = this._lightDimension;
        this._dirLight.shadow.camera.top = this._lightDimension;
        this._dirLight.shadow.camera.bottom = -this._lightDimension;

        this._dirLight.shadow.camera.far = this._lightDimension;
        this._dirLight.shadow.bias = -0.00001;
        this.scene.add( this._dirLight );
    }

    initFog() {
        this.scene.fog = new THREE.Fog(0x222233, 0, 20000);
        this.renderer.setClearColor( this.scene.fog.color, 1 );

        this.__vertexShader = document.getElementById( 'vertexShader' ).textContent;
        this.__fragmentShader = document.getElementById( 'fragmentShader' ).textContent;
        this.__uniforms = {
            topColor:    { type: "c", value: new THREE.Color( 0x0077ff ) },
            bottomColor: { type: "c", value: new THREE.Color( 0xffffff ) },
            offset:      { type: "f", value: 43 },
            exponent:    { type: "f", value: 0.6 }
        }
            
        this.__uniforms.topColor.value.copy( this._hemiLight.color );
        this.scene.fog.color.copy( this.__uniforms.bottomColor.value );
    }

    initSky() {
        this.__skyGeo = new THREE.SphereBufferGeometry( (16384 / Math.sqrt(2)), 32, 15 );
        this.__skyMat = new THREE.ShaderMaterial( { vertexShader: this.__vertexShader, fragmentShader: this.__fragmentShader, uniforms: this.__uniforms, side: THREE.BackSide } );
        this._sky = new THREE.Mesh( this.__skyGeo, this.__skyMat );
        this._sky.position.y = 8500;
        this._sky.name = "sky";
        console.log(this._sky);
        this.scene.add(this._sky);
    }

    update() {
        let f = 0;

        this.__time = new Date().getTime() * 0.0002;

        this.__nsin = Math.sin(this.__time);
        this.__ncos = Math.cos(this.__time); 

        this._dirLight.position.set( 1500 * this.__nsin, 2000 * this.__nsin, 2000 * this.__ncos);
        
        if (this.__nsin > 0.2 ) {
          this._sky.material.uniforms.topColor.value.setRGB(0.25, 0.55, 1);
          this._sky.material.uniforms.bottomColor.value.setRGB(1, 1, 1);
          f = 1;
          this._dirLight.intensity = f;

          this._dayState = "Day";
          EntityManager.mobAlreadyGenerated = false;
        }

        else if (this.__nsin < 0.2 && this.__nsin > 0.0 ) {
          f = this.__nsin / 0.2;
          this._dirLight.intensity = f;
      
          this._sky.material.uniforms.topColor.value.setRGB(0.25 * f, 0.55 * f, 1 * f);
          this._sky.material.uniforms.bottomColor.value.setRGB(1 * f, 1 * f, 1 * f);

          this._dayState = "Afternoon";
        }

        else {
          f = 0;
          this._dirLight.intensity = f;
          this._sky.material.uniforms.topColor.value.setRGB(0, 0, 0);
          this._sky.material.uniforms.bottomColor.value.setRGB(0, 0, 0);

          this._dayState = "Night";
        }

        return this._dayState;
    }

    set setLightDimension(lightDimension) {
        this._lightDimension = lightDimension;
    }
}