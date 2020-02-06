<template>
  <div id="q-app" class="column" style="height:100vh">
    <div class="col-auto row">
      <q-input 
        dense
        square
        outlined
        class="" 
        style="flex: 1"
        bordered 
        v-model="sFilterText" 
        type="text" 
        label="Filter..." 
      />
      <q-btn flat icon="delete" @click="fnClearList" />
      <q-btn-dropdown icon="more_vert" flat>
        <q-list>
          <q-item dense>
            <q-item-section>
              <q-checkbox dense left-label v-model="oConfig.bWatchForImages" label="Watch for images" />
            </q-item-section>
          </q-item>
          <q-item dense>
            <q-item-section>
              <q-checkbox dense left-label v-model="oConfig.bWatchForText" label="Watch for text" />
            </q-item-section>
          </q-item>
          <q-item dense>
            <q-item-section>
              <q-input dense v-model="oConfig.sBroadcastIP" type="text" label="Send to IP" />
            </q-item-section>
          </q-item>

          <hr>

          <q-item dense v-for="(sIP) in aIPs">
            <q-item-section>
              <q-item-label>{{ sIP }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>
    </div>
    
    <div class="col full-height" style="overflow-y: scroll;align-items:stretch">
      <q-list 
        bordered 
        separator 
        class="col"
        v-if="iFilteredListLength"
      >
        <q-item
          dense
          v-for="(oItem, sKey) in oFilteredList"
          v-bind:key="sKey"
          clickable 
          v-ripple
          class="has-hidden-buttons"
        >
          <q-item-section 
            v-if="oItem.sType=='text'"
            style="text-overflow:ellipsis; word-break: break-all"
          >
            {{ fnCutText(oItem.sText) }}
          </q-item-section>
          <q-item-section 
            v-if="oItem.sType=='image'"
            style=""
          >
            <img style="width:100px" :src="oItem.sText">
          </q-item-section>
          <q-item-section side top>
            <q-item-label caption>{{ fnFormatDateTime(oItem.iTime) }}</q-item-label>
            <q-btn-group flat dense class="hidden-buttons">
              <q-btn
                dense 
                icon="send" 
                @click="fnSendItem(sKey)"/>
              <q-btn
                dense 
                icon="move_to_inbox" 
                @click="fnCopyToClipboard(sKey)"/>
              <q-btn 
                dense
                icon="delete" 
                @click="fnDeleteItem(sKey)"/>
            </q-btn-group>
          </q-item-section>
        </q-item>
      </q-list>
    </div>
  </div>
</template>

<style>
.has-hidden-buttons:hover .hidden-buttons {
  display: inline-flex !important;
}
.hidden-buttons {
  display: none !important;
}
.q-btn-dropdown__arrow {
  display: none;
}
</style>

<script>

import Vue from 'vue'
import { ipcRenderer } from 'electron'
import moment from 'moment'

import fnGetAllIPsFromAllInterfaces from './lib/interfaces';

export default {
  name: 'App',

  computed: {
    aIPs() {
      var aIPs = fnGetAllIPsFromAllInterfaces();

      aIPs = aIPs.filter((v) => v != "127.0.0.1" && v.trim() != "::1");

      return aIPs;
    },
    oFilteredList() {
      var oThis = this;
      var oFilteredList = {};
      oThis.iFilteredListLength = 0;

      var aKeys = Object.keys(oThis.oList).reverse();

      for (var sKey of aKeys) {
        if (!oThis.sFilterText || ~oThis.oList[sKey].sText.indexOf(oThis.sFilterText)) {
          oFilteredList[sKey] = oThis.oList[sKey];
          oThis.iFilteredListLength++;
        }
      }

      console.log('oFilteredList', {oFilteredList});

      return oFilteredList;

      //var key oThis.oList
      /*
      return oThis.aList.reverse().filter((v) => !oThis.sFilterText 
        || (oThis.sFilterText 
        && ~v.sText.indexOf(oThis.sFilterText))
      );
      */
    }
  },

  data()
  {
    return {
      // aList: [],
      oList: {},
      iFilteredListLength: 0,
      sFilterText: "",
      oConfig: {
        sBroadcastIP: "255.255.255.255",
        bWatchForText: true,
        bWatchForImages: true
      }
    }
  },

  watch: {
    oConfig: {
      handler: (n, o) => {
        ipcRenderer.send('config-update', n);
      },
      deep: true
    }
  },

  methods: {
    fnSendItem(sKey)
    {
      ipcRenderer.send('send-item', sKey);
    },
    fnCutText(sText) {
      //sText = sText.split('\n')[0];
      return sText.length > 70 ? sText.substr(0, 70).trim()+"..." : sText;
    },
    fnFormatDateTime(iTime) {
      return moment(iTime).format("DD.MM.YYYY HH:mm:ss");
    },
    fnCopyToClipboard(sKey) {
      ipcRenderer.send('copy-to-cb-item', sKey);
    },
    fnClearList() {
      ipcRenderer.send('clear-list');
    },
    fnDeleteItem(sKey) {
      ipcRenderer.send('delete-item', sKey);
    }
  },

  created()
  {
    var oThis = this;

    ipcRenderer.on('clipboard-update', (oEvent, oList) => {
      // oThis.aList = aList;
      console.log('clipboard-update', { oEvent, oList });
      Vue.set(oThis, 'oList', oList);
      oThis.iFilteredListLength = Object.keys(oList).length;
      // oThis.$forceUpdate();
    });

    ipcRenderer.on('config-update', (oEvent, oConfig) => {
      console.log('oConfig', oConfig);
      Vue.set(oThis, 'oConfig', oConfig);
      console.log('this.oConfig', this.oConfig);
    });

    ipcRenderer.send('renderer-app-created');
  },

  mounted() 
  {
    ipcRenderer.send('renderer-app-created');
  }
}
</script>
