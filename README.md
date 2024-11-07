# SoVisu+

A Comprehensive App for Managing Scientific Output and Researcher Identifiers

SoVisu+ is distributed under the terms of the [CeCILL v2.1 license](http://www.cecill.info/licences/Licence_CeCILL_V2.1-fr.txt) (GPL compatible).

:warning: This project is still in development and is not yet ready for production.

## Installation

### Manual Installation

1. Clone the repository
2. Install the dependencies with `npm install`. To include dev dependencies, use `npm install --dev`.
3. Install Postgresql and create a database.
Prisma initial migration requires the CREATE DATABASE privilege.
```sql
CREATE USER sovisuplus WITH PASSWORD '**************'; 
ALTER USER sovisuplus CREATEDB;
[DROP DATABASE sovisuplus;]
CREATE DATABASE sovisuplus;
GRANT ALL PRIVILEGES ON DATABASE sovisuplus to sovisuplus;
```