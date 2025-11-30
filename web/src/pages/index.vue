<template>
    <div>
        <div v-show="!showSpin">
            <Row>
                <Col span="12">
                    <Select v-model="activeWallet" style="width:105px; margin: 10px;" placeholder="Select wallet" @on-select="selectWallet">
                        <Option value="hot">Hot wallet</Option>
                        <Option value="cold">Cold wallet</Option>
                    </Select>
                </Col>
                <Col span="12">
                    <WalletPanel ref="walletPanel" />
                </Col>
            </Row>
            <VaultPanel ref="SelfVault" :getSelf="getSelf"/>
        </div>
        <Spin size="large" fix v-if="showSpin"></Spin>
    </div>
</template>
<script>
import VaultPanel from './vault.vue';
import WalletPanel from './wallet.vue';

export default {
    components: {
        WalletPanel,
        VaultPanel
    },
    inject: ["reload"],
    data() {
        return {
            apiPrefix: '',
            showSpin: false,
            activeWallet: "hot"
        }
    },
    methods: {
        getSelf() {
            return this;
        },
        getWallet() {
            return this.$refs.walletPanel;
        },
        enableSpin(status) {
            this.showSpin = status;
        },
        selectWallet(item) {
            this.activeWallet = item.value;
            this.$refs.SelfVault.changewalletMode();
        },
        httpGet(url, formdata, onResponse, onPanic) {
            this.$axios.get(this.apiPrefix + url, {params: formdata})
            .then(function(response) {
                if (onResponse !== undefined && onResponse !== null) onResponse(response);
            })
            .catch(function(e) {
                console.log(e);
            });
        },
        httpPost(url, formdata, onResponse, onPanic) {
            this.$axios.post(this.apiPrefix + url, formdata)
            .then(function(response) {
                if (onResponse !== undefined && onResponse !== null) onResponse(response);
            })
            .catch(function(e) {
                console.log(e);
            });
        }
    }
}
</script>