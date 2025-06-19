


class XMLHelper:
    def get_node_data(self,xml_element, nodeToFetch):
        nodeData = xml_element.findall(".//{http://xmlns.reliance.com/schema}" + nodeToFetch)
        if nodeData and len(nodeData):
            return nodeData[0].text

        else:
            print("NO " + nodeToFetch + " Found")
            return ""

    def get_direct_value_from_idoc(self,idoc, segment, original_key):
        value = []
        ls = idoc.get(segment)
        if ls and isinstance(ls, list):
            for item in ls:
                value.append(item.get(original_key))
        else:
            if idoc.get(segment) and idoc.get(segment).get(original_key):
                value.append(idoc.get(segment).get(original_key))

        if len(value) > 0:
            return value[0]
        else:
            return ""
    
    def validate_xml_with_xsd(self,xml_validator, xml):
        print('In validateXMLWithXSD')
        return xml_validator.validate(xml)