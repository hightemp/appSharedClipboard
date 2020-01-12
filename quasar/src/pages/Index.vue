<template>
  <div class="column full-height">
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
            v-for="(oItem, iIndex) in aList"
            v-bind:key="iIndex"
            clickable 
            v-ripple
          >
            <q-item-section 
              v-if="oItem.sType=='text'"
            >{{ oItem.sText }}</q-item-section>
            <q-item-section side top>
              <q-item-label caption>{{ fnFormatDateTime(oItem.iTime) }}</q-item-label>
              <q-btn-group flat dense>
                <q-btn
                  dense 
                  icon="move_to_inbox" 
                  @click="fnCopyToClipboardText(oItem.sText)"/>
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

import { ipcRenderer, clipboard } from 'electron'
import moment from 'moment'

export default {
  name: 'PageIndex',

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
    fnFormatDateTime(iTime) {
      return moment(iTime).format("DD.MM.YYYY HH:mm:ss");
    },
    fnCopyToClipboardText(sText) {
      clipboard.writeText(sText);
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
    });
  }
}
</script>
