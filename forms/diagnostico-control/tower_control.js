/* =========================================================================
   tower_control.js — Capa de datos (Firebase Realtime Database) + anti-trampa
   Curso IFA00117. Requiere que el HTML ya haya cargado:
     firebase-app-compat.js, firebase-database-compat.js
     y ejecutado firebase.initializeApp({...tu config tower-ing...})
   Nodo raíz de esta experiencia: "diagnostico_control".
   Estructura:
     diagnostico_control/
       participantes/{cedula}            -> {nombre, creado}
       intentos/{cedula}/{actN}          -> {nombre, intentos, anulados,
                                             mejorPuntaje, logro, aprobado,
                                             aprobadoEn, ultimo:{...}}
   ========================================================================= */
(function(global){
  "use strict";
  var NODO = "diagnostico_control";
  function db(){ return firebase.database(); }
  function root(){ return db().ref(NODO); }

  // Reloj del servidor: evita que alguien adelante el reloj local para saltarse las compuertas.
  var serverOffset = 0, clockReady = false;
  function initClock(){
    if(clockReady) return;
    clockReady = true;
    db().ref(".info/serverTimeOffset").on("value", function(s){ serverOffset = s.val()||0; });
  }
  function serverNow(){ return Date.now() + serverOffset; }

  var TowerDB = {
    NODO: NODO,
    serverNow: serverNow,
    init: function(){ initClock(); },

    // Registra al participante (no sobrescribe si ya existe).
    registerParticipant: function(cc, nombre){
      return root().child("participantes/"+cc).transaction(function(cur){
        if(cur) return cur;
        return { nombre: nombre, creado: firebase.database.ServerValue.TIMESTAMP };
      });
    },

    // Carga intentos de una actividad para una cédula + arma el ranking de esa actividad.
    // Devuelve Promise<{attempts, board:[{cc,name,score}], mine}>
    loadActivity: function(cc, act){
      return root().child("intentos").once("value").then(function(snap){
        var all = snap.val() || {};
        var mine = (all[cc] && all[cc][act]) ? all[cc][act] : null;
        var attempts = mine ? (mine.intentos||0) : 0;
        var board = [];
        Object.keys(all).forEach(function(k){
          var a = all[k][act];
          if(a && typeof a.mejorPuntaje === "number" && a.mejorPuntaje > 0){
            board.push({ cc:k, name:(a.nombre||"—"), score:a.mejorPuntaje });
          }
        });
        board.sort(function(x,y){ return y.score - x.score; });
        return { attempts:attempts, board:board, mine:mine };
      });
    },

    // Guarda un resultado. Incrementa intentos, conserva el mejor puntaje,
    // fija aprobadoEn (marca del servidor) la primera vez que aprueba.
    // res = {nombre, score, logro, aprobado, anulado, detalle}
    // Devuelve Promise<{attempts, board, mine}> (ranking actualizado).
    saveResult: function(cc, act, res){
      return root().child("intentos/"+cc+"/"+act).transaction(function(cur){
        cur = cur || { intentos:0, anulados:0, mejorPuntaje:0, logro:0, aprobado:false };
        cur.nombre   = res.nombre;
        cur.intentos = (cur.intentos||0) + 1;
        if(res.anulado){
          cur.anulados = (cur.anulados||0) + 1;
        } else {
          if((res.score||0) > (cur.mejorPuntaje||0)) cur.mejorPuntaje = res.score||0;
          if((res.logro||0) > (cur.logro||0))        cur.logro       = res.logro||0;
          if(res.aprobado){
            cur.aprobado = true;
            if(!cur.aprobadoEn) cur.aprobadoEn = firebase.database.ServerValue.TIMESTAMP;
          }
        }
        cur.ultimo = {
          score:res.score||0, logro:res.logro||0,
          aprobado:!!res.aprobado, anulado:!!res.anulado,
          inicio:res.inicio||null, duracionSeg:res.duracionSeg||null,
          detalle:res.detalle||null, ts:firebase.database.ServerValue.TIMESTAMP
        };
        return cur;
      }).then(function(){ return TowerDB.loadActivity(cc, act); });
    },

    // Progreso completo de una cédula (para el panel). Promise<{act1:{...},...}>
    loadProgress: function(cc){
      return root().child("intentos/"+cc).once("value").then(function(s){ return s.val() || {}; });
    },

    // Todo (para el dashboard docente). Promise<{intentos, participantes}>
    loadAll: function(){
      return root().once("value").then(function(s){
        var v = s.val() || {};
        return { intentos: v.intentos||{}, participantes: v.participantes||{} };
      });
    }
  };

  /* ---- Anti-trampa (escudo): cerrar el intento si sale de la pantalla ---- */
  var TowerShield = {
    _armed:false, _violated:false, _cb:null,
    arm: function(onViolation){
      var self = this;
      self._cb = onViolation; self._armed = true; self._violated = false;
      function trip(motivo){
        if(!self._armed || self._violated) return;
        self._violated = true; self._armed = false;
        try{ if(self._cb) self._cb(motivo||"salida"); }catch(e){}
      }
      self._onVis  = function(){ if(document.hidden) trip("cambio de pestaña/minimizó"); };
      self._onBlur = function(){ trip("perdió el foco de la ventana"); };
      document.addEventListener("visibilitychange", self._onVis);
      window.addEventListener("blur", self._onBlur);
    },
    disarm: function(){
      this._armed = false;
      if(this._onVis)  document.removeEventListener("visibilitychange", this._onVis);
      if(this._onBlur) window.removeEventListener("blur", this._onBlur);
    }
  };

  global.TowerDB = TowerDB;
  global.TowerShield = TowerShield;
})(window);
