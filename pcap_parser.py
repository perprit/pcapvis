import dpkt, json

def pcap_to_json(fp):
    pcap = dpkt.pcap.Reader(fp)
    eth = lambda x: dpkt.ethernet.Ethernet(x)
    tcps = [{'ts': ts, 'dport': eth(buf).data.data.dport, 'sport': eth(buf).data.data.sport} for ts, buf in pcap if eth(buf).data.p == 6]
    return json.dumps(tcps)
