<template>
  <div id="q-app" class="column" style="height:100vh">
    <div class="col-auto row top-row">
      <q-input 
        dense
        square
        filled
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

    <q-item
      v-if="oClipboard"
      dense
      clickable 
      v-ripple
      class="clipboard-item"
      @mouseover="sMouseOverItem='clipboard'"
    >
      <q-item-section 
        v-if="oClipboard.sType=='text'"
        style="text-overflow:ellipsis; word-break: break-all"
      >
        {{ fnCutText(oClipboard.sText) }}
      </q-item-section>
      <q-item-section 
        v-if="oClipboard.sType=='image'"
        style=""
      >
        <img style="width:100px" :src="oClipboard.sText">
      </q-item-section>
      <q-item-section side top>
        <q-item-label caption>{{ fnFormatDateTime(oClipboard.iTime) }}</q-item-label>
        <q-btn-group flat dense v-if="sMouseOverItem=='clipboard'">
          <q-btn
            dense 
            icon="send" 
            @click="fnSendClipboard()"
            title="send item to all"
          />
          <q-btn 
            dense
            icon="delete" 
            @click="fnClearClipboard()"
            title="clear"
          />
        </q-btn-group>
      </q-item-section>
    </q-item>
    
    <q-virtual-scroll
      :items="aFilteredList"
      separator
      class="col full-height"
    >
      <template v-slot="{ item, index }">
        <q-item
          dense
          :key="item.sKey"
          clickable 
          v-ripple
          class=""
          @mouseover="sMouseOverItem=item.sKey"
        >
          <q-item-section 
            v-if="item.oItem.sType=='text'"
            style="text-overflow:ellipsis; word-break: break-all"
          >
            {{ fnCutText(item.oItem.sText) }}
          </q-item-section>
          <q-item-section 
            v-if="item.oItem.sType=='image'"
            style=""
          >
            <img style="width:100px" :src="item.oItem.sText">
          </q-item-section>
          <q-item-section side top>
            <q-item-label caption>{{ fnFormatDateTime(item.oItem.iTime) }}</q-item-label>
            <q-btn-group flat dense v-if="sMouseOverItem==item.sKey">
              <q-btn
                dense 
                icon="send" 
                @click="fnSendItem(item.sKey)"
                title="send item to all"
              />
              <q-btn
                dense 
                icon="move_to_inbox" 
                @click="fnCopyToClipboard(item.sKey)"
                title="copy to clipboard"
              />
              <q-btn 
                dense
                icon="delete" 
                @click="fnDeleteItem(item.sKey)"
                title="delete"
              />
            </q-btn-group>
          </q-item-section>
        </q-item>
      </template>
    </q-virtual-scroll>    
  </div>
</template>

<style>
/*
.has-hidden-buttons:hover .hidden-buttons {
  display: inline-flex !important;
}
.hidden-buttons {
  display: none !important;
}
*/
.clipboard-item {
  background: #eee;
  border-top: 1px solid #aaa;
  border-bottom: 1px solid #aaa;
  min-height: 52px !important;
}
.top-row {
  background: #ddd;
}
.q-btn-dropdown__arrow {
  display: none;
}
.q-item {
  min-height: 51px;
}
</style>

<script>

import Vue from 'vue'
import { ipcRenderer, clipboard } from 'electron'
import moment from 'moment'

import fnGetAllIPsFromAllInterfaces from './lib/interfaces';

export default {
  name: 'App',

  computed: {
    aIPs() 
    {
      var aIPs = fnGetAllIPsFromAllInterfaces();

      aIPs = aIPs.filter((v) => v != "127.0.0.1" && v.trim() != "::1");

      return aIPs;
    },
    aFilteredList()
    {
      var oThis = this;
      var oItems = oThis.oFilteredList;
      var aResult = [];

      var aKeys = Object.keys(oItems);

      aKeys.forEach((sKey) => {
        aResult.push({
          sKey,
          oItem: oItems[sKey]
        });
      });

      return aResult;
    },
    oFilteredList() 
    {
      var oThis = this;
      var oFilteredList = {};
      oThis.iFilteredListLength = 0;

      var aKeys = Object.keys(oThis.oList).filter((v) => v!='clipboard').reverse();

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
      sMouseOverItem: "",

      oClipboard: null,

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
    fnUpdateClipboard()
    {
      var oThis = this;
      var oNativeImage = clipboard.readImage();

      console.log('>>oNativeImage', oNativeImage, oNativeImage.isEmpty());

      if (oNativeImage && oNativeImage.isEmpty && !oNativeImage.isEmpty()) {
        oThis.oClipboard = {
          iTime: moment().valueOf(),
          sType: 'image',
          sText: oNativeImage.toDataURL()
        };
      } else {
        var sText = clipboard.readText();

        console.log('>>sText', sText);

        oThis.oClipboard = {
          iTime: moment().valueOf(),
          sType: 'text',
          sText: sText
        };
      }

      oThis.$nextTick(() => {
        setTimeout(oThis.fnUpdateClipboard, 2000);
      });      
    },
    fnSendClipboard()
    {
      var oThis = this;

      ipcRenderer.send('send-clipboard', oThis.oClipboard);
    },
    fnClearClipboard()
    {
      clipboard.clear();
    },
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
  
    oThis.fnUpdateClipboard();

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
