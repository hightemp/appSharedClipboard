<template>
  <div id="q-app" class="column full-height">
    <q-input 
      class="" 
      style="flex: 1"
      bordered 
      v-model="sFilterText" 
      type="text" 
      label="Filter..." 
    />
    <div class="" style="flex: 1">
      <div class="col full-height" style="overflow-y: scroll">
        <q-list bordered separator class="col">
          <q-item
            dense
            v-for="(oItem, iIndex) in aFilteredList"
            v-bind:key="iIndex"
            clickable 
            v-ripple
          >
            <q-item-section 
              v-if="oItem.sType=='text'"
            >{{ fnCutText(oItem.sText) }}</q-item-section>
            <q-item-section side top>
              <q-item-label caption>{{ fnFormatDateTime(oItem.iTime) }}</q-item-label>
              <q-btn-group flat dense>
                <q-btn
                  dense 
                  icon="move_to_inbox" 
                  @click="fnCopyToClipboard(oItem)"/>
                <q-btn 
                  dense
                  icon="delete" 
                  @click="fnDeleteItem(oItem)"/>
              </q-btn-group>
            </q-item-section>
          </q-item>
        </q-list>
      </div>
    </div>
  </div>
</template>

<script>

import { ipcRenderer } from 'electron'
import moment from 'moment'

export default {
  name: 'App',

  computed: {
    aFilteredList() {
      var oThis = this;
      return oThis.aList.reverse().filter((v) => !oThis.sFilterText 
        || (oThis.sFilterText 
        && ~v.sText.indexOf(oThis.sFilterText))
      );
    }
  },

  data()
  {
    return {
      aList: [],
      sFilterText: ""
    }
  },

  methods: {
    fnCutText(sText) {
      //sText = sText.split('\n')[0];
      return sText.length > 70 ? sText.substr(0, 70).trim()+"..." : sText;
    },
    fnFormatDateTime(iTime) {
      return moment(iTime).format("DD.MM.YYYY HH:mm:ss");
    },
    fnCopyToClipboard(oItem) {
      ipcRenderer.send('copy-to-cb-item', oItem);
    },
    fnDeleteItem(oItem) {
      ipcRenderer.send('delete-item', oItem);
    }
  },

  created()
  {
    var oThis = this;

    ipcRenderer.on('clipboard-update', (oEvent, aList) => {
      oThis.aList = aList;
      for (var i=0; i<100; i++) {
        oThis.aList.push({
          sType: "text",
          sText: "dfadfafdafd"
        });
      }
    });

    ipcRenderer.send('renderer-app-created');
  },

  mounted() 
  {
    ipcRenderer.send('renderer-app-created');
  }
}
</script>
